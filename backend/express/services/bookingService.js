import parkingSlot from "../model/parkingSlot.js";
import parkingLot from "../model/parkingLotModel.js";
import Booking from "../model/bookingModel.js";
import { withTransaction } from "../utils/transaction.js";
import { publishEvent } from "./notifications.js";
import { AppError } from "../utils/AppError.js";
import { BOOKING_STATUS, BOOKING_TYPE, SLOT_STATUS, MIN_BOOKING_MINUTES, MANUAL_BOOKING_DURATION_HOURS } from "../constants/index.js";
import { EVENTS } from "../../shared/events.js";
import { createNotification } from "./notificationService.js";
import { NOTIFICATION_TYPE } from "../constants/index.js";

function assertValidWindow(startTime, endTime) {
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        throw new AppError("A valid start and end time are required", 400, "INVALID_DATE");
    }
    if (endTime <= startTime) {
        throw new AppError("End time must be after start time", 400, "INVALID_RANGE");
    }
    if (startTime < new Date(Date.now() - 60 * 1000)) {
        throw new AppError("Cannot book a slot in the past", 400, "PAST_START");
    }
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (60 * 1000);
    if (durationMinutes < MIN_BOOKING_MINUTES) {
        throw new AppError(`Booking duration must be at least ${MIN_BOOKING_MINUTES} minutes`, 400, "DURATION_TOO_SHORT");
    }
}

function calculateAmount(hourlyRate, startTime, endTime) {
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.ceil(durationMs / (60 * 60 * 1000));
    return hours * hourlyRate;
}

async function reserveSlotForUpdate(slotId, session) {
    const slot = await parkingSlot.findOneAndUpdate(
        { _id: slotId },
        { $inc: { reservationSeq: 1 } },
        { new: true, session }
    );
    return slot;
}

async function hasOverlap(slotId, startTime, endTime, session) {
    const overlap = await Booking.findOne({
        slotId,
        status: { $in: [BOOKING_STATUS.UPCOMING, BOOKING_STATUS.ACTIVE] },
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
    }).session(session);
    return Boolean(overlap);
}

export async function createOnlineBooking({ userId, lotId, slotIds, startTime, endTime }) {
    assertValidWindow(startTime, endTime);

    const lot = await parkingLot.findById(lotId);
    if (!lot) throw new AppError("Parking lot not found", 404, "LOT_NOT_FOUND");

    const amountPerSlot = calculateAmount(lot.hourlyRates, startTime, endTime);

    const { bookings, events } = await withTransaction(async (session) => {
        const events = [];
        const bookings = [];

        for (const slotId of slotIds) {
            const slot = await reserveSlotForUpdate(slotId, session);
            if (!slot || String(slot.lotId) !== String(lotId)) {
                throw new AppError("One or more slots are invalid for this lot", 400, "INVALID_SLOT");
            }
            if (slot.status !== SLOT_STATUS.AVAILABLE) {
                throw new AppError(`Slot ${slot.name || slot._id} is not available`, 409, "SLOT_UNAVAILABLE");
            }
            if (await hasOverlap(slotId, startTime, endTime, session)) {
                throw new AppError(`Slot ${slot.name || slot._id} is already booked for the selected time`, 409, "BOOKING_CONFLICT");
            }

            const [booking] = await Booking.create(
                [
                    {
                        userId,
                        slotId,
                        lotId,
                        startTime,
                        endTime,
                        amount: amountPerSlot,
                        status: BOOKING_STATUS.UPCOMING,
                        bookingType: BOOKING_TYPE.ONLINE,
                    },
                ],
                { session }
            );
            bookings.push(booking);

            events.push({ type: EVENTS.BOOKING_CREATED, payload: { bookingId: booking._id, userId, vendorId: lot.createdBy, lotId, slotId, status: booking.status, bookingType: BOOKING_TYPE.ONLINE, startTime, endTime, amount: amountPerSlot } });
            events.push({ type: EVENTS.SLOT_STATUS_UPDATED, payload: { lotId, slotId, vendorId: lot.createdBy, userId, status: SLOT_STATUS.AVAILABLE } });
        }

        return { bookings, events };
    });

    for (const event of events) await publishEvent(event.type, event.payload);
    for (const booking of bookings) {
        await createNotification({
            userId,
            type: NOTIFICATION_TYPE.BOOKING_CONFIRMED,
            title: "Booking confirmed",
            message: `Your booking at ${lot.name} is confirmed for ${booking.startTime.toLocaleString()}.`,
            metadata: { bookingId: booking._id, lotId },
        });
        await createNotification({
            userId: lot.createdBy,
            type: NOTIFICATION_TYPE.NEW_BOOKING,
            title: "New booking",
            message: `A customer booked a slot at ${lot.name}.`,
            metadata: { bookingId: booking._id, lotId },
        });
    }
    return bookings;
}

export async function createManualBooking({ vendorId, lotId, slotId }) {
    const lot = await parkingLot.findOne({ _id: lotId, createdBy: vendorId });
    if (!lot) throw new AppError("Lot not associated with vendor", 404, "LOT_NOT_FOUND");

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + MANUAL_BOOKING_DURATION_HOURS * 60 * 60 * 1000);
    const amount = calculateAmount(lot.hourlyRates, startTime, endTime);

    const { booking, events } = await withTransaction(async (session) => {
        const slot = await reserveSlotForUpdate(slotId, session);
        if (!slot || String(slot.lotId) !== String(lotId)) {
            throw new AppError("Slot not present on this parking lot", 404, "SLOT_NOT_FOUND");
        }
        if (slot.status !== SLOT_STATUS.AVAILABLE) {
            throw new AppError("Slot is not available for booking", 409, "SLOT_UNAVAILABLE");
        }
        if (await hasOverlap(slotId, startTime, endTime, session)) {
            throw new AppError("Overlapping booking for this slot", 409, "BOOKING_CONFLICT");
        }

        const [booking] = await Booking.create(
            [{ userId: vendorId, slotId, lotId, startTime, endTime, amount, status: BOOKING_STATUS.ACTIVE, bookingType: BOOKING_TYPE.MANUAL }],
            { session }
        );

        slot.status = SLOT_STATUS.OCCUPIED;
        slot.currentbookingId = booking._id;
        await slot.save({ session });

        const events = [
            { type: EVENTS.BOOKING_CREATED, payload: { bookingId: booking._id, userId: vendorId, vendorId, lotId, slotId, status: booking.status, bookingType: BOOKING_TYPE.MANUAL, startTime, endTime, amount } },
            { type: EVENTS.SLOT_STATUS_UPDATED, payload: { lotId, slotId, vendorId, status: SLOT_STATUS.OCCUPIED } },
        ];

        return { booking, events };
    });

    for (const event of events) await publishEvent(event.type, event.payload);
    return booking;
}

export async function completeManualBooking({ vendorId, lotId, slotId }) {
    const lot = await parkingLot.findOne({ _id: lotId, createdBy: vendorId });
    if (!lot) throw new AppError("Lot not associated with vendor", 404, "LOT_NOT_FOUND");

    const now = new Date();

    const { booking, events } = await withTransaction(async (session) => {
        const slot = await reserveSlotForUpdate(slotId, session);
        if (!slot || String(slot.lotId) !== String(lotId)) {
            throw new AppError("Slot not found in the specified lot", 404, "SLOT_NOT_FOUND");
        }
        if (!slot.currentbookingId) {
            throw new AppError("No active booking for this slot", 400, "NO_ACTIVE_BOOKING");
        }

        const booking = await Booking.findOneAndUpdate(
            { _id: slot.currentbookingId, slotId, lotId, status: BOOKING_STATUS.ACTIVE, bookingType: BOOKING_TYPE.MANUAL },
            { status: BOOKING_STATUS.COMPLETED, endTime: now },
            { new: true, session }
        );
        if (!booking) throw new AppError("No active manual booking found to complete", 404, "BOOKING_NOT_FOUND");

        slot.status = SLOT_STATUS.AVAILABLE;
        slot.currentbookingId = null;
        await slot.save({ session });

        const events = [
            { type: EVENTS.BOOKING_COMPLETED, payload: { bookingId: booking._id, userId: booking.userId, vendorId, lotId, slotId, status: booking.status, amount: booking.amount } },
            { type: EVENTS.SLOT_STATUS_UPDATED, payload: { lotId, slotId, vendorId, status: SLOT_STATUS.AVAILABLE } },
        ];

        return { booking, events };
    });

    for (const event of events) await publishEvent(event.type, event.payload);
    await createNotification({
        userId: vendorId,
        type: NOTIFICATION_TYPE.MANUAL_SESSION_COMPLETED,
        title: "Walk-in session completed",
        message: `Manual parking session at ${lot.name} completed for ₹${booking.amount}.`,
        metadata: { bookingId: booking._id, lotId },
    });
    return booking;
}

export async function cancelBooking({ userId, bookingId }) {
    const booking = await Booking.findOneAndUpdate(
        { _id: bookingId, userId, status: BOOKING_STATUS.UPCOMING },
        { status: BOOKING_STATUS.CANCELLED },
        { new: true }
    );
    if (!booking) {
        throw new AppError("Booking not found or not eligible for cancellation", 404, "BOOKING_NOT_CANCELLABLE");
    }

    const lot = await parkingLot.findById(booking.lotId).select("createdBy");

    await publishEvent(EVENTS.BOOKING_CANCELLED, { bookingId: booking._id, userId: booking.userId, vendorId: lot?.createdBy, lotId: booking.lotId, slotId: booking.slotId, status: booking.status });
    await publishEvent(EVENTS.SLOT_STATUS_UPDATED, { lotId: booking.lotId, slotId: booking.slotId, userId: booking.userId, vendorId: lot?.createdBy, status: SLOT_STATUS.AVAILABLE });

    await createNotification({
        userId: booking.userId,
        type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
        title: "Booking cancelled",
        message: "Your booking was cancelled.",
        metadata: { bookingId: booking._id, lotId: booking.lotId },
    });
    if (lot) {
        await createNotification({
            userId: lot.createdBy,
            type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
            title: "Booking cancelled",
            message: "A customer cancelled their booking.",
            metadata: { bookingId: booking._id, lotId: booking.lotId },
        });
    }

    return booking;
}
