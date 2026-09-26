import parkingSlot from "../model/parkingSlot.js";
import Booking from "../model/bookingModel.js";
import { withTransaction } from "../utils/transaction.js";
import { publishEvent } from "./notifications.js";
import { createNotification } from "./notificationService.js";
import { AppError } from "../utils/AppError.js";
import { BOOKING_STATUS, SLOT_STATUS, NOTIFICATION_TYPE } from "../constants/index.js";
import { EVENTS } from "../../shared/events.js";

export async function createSlot({ vendorId, lotId, name, slotType, vertices }) {
    const slot = await parkingSlot.create({ lotId, name, slotType, vertices, status: SLOT_STATUS.AVAILABLE });
    await publishEvent(EVENTS.PARKING_LOT_UPDATED, { lotId, vendorId, reason: "SLOT_ADDED" });
    return slot;
}

export async function updateSlot({ vendorId, lotId, slotId, updates }) {
    const slot = await parkingSlot.findOneAndUpdate({ _id: slotId, lotId }, updates, { new: true, runValidators: true });
    if (!slot) throw new AppError("Slot not found in this lot", 404, "SLOT_NOT_FOUND");
    await publishEvent(EVENTS.PARKING_LOT_UPDATED, { lotId, vendorId, reason: "SLOT_UPDATED", slotId });
    return slot;
}

export async function deleteSlot({ vendorId, lotId, slotId }) {
    const activeBooking = await Booking.findOne({ slotId, status: { $in: [BOOKING_STATUS.UPCOMING, BOOKING_STATUS.ACTIVE] } });
    if (activeBooking) {
        throw new AppError("Cannot delete a slot with an active or upcoming booking", 409, "SLOT_HAS_BOOKINGS");
    }
    const slot = await parkingSlot.findOneAndDelete({ _id: slotId, lotId });
    if (!slot) throw new AppError("Slot not found in this lot", 404, "SLOT_NOT_FOUND");
    await publishEvent(EVENTS.PARKING_LOT_UPDATED, { lotId, vendorId, reason: "SLOT_DELETED", slotId });
}

export async function changeSlotAvailability({ vendorId, lotId, slotIds, statusTo }) {
    const { events, affectedBookings } = await withTransaction(async (session) => {
        const result = await parkingSlot.updateMany(
            { _id: { $in: slotIds }, lotId },
            { $set: { status: statusTo, currentbookingId: null } },
            { session }
        );
        if (result.matchedCount === 0) {
            throw new AppError("No matching slots found for this lot", 404, "SLOT_NOT_FOUND");
        }

        let affectedBookings = [];
        if (statusTo === SLOT_STATUS.UNAVAILABLE) {
            affectedBookings = await Booking.find(
                { slotId: { $in: slotIds }, status: { $in: [BOOKING_STATUS.UPCOMING, BOOKING_STATUS.ACTIVE] } },
                "userId slotId"
            ).session(session);
            await Booking.updateMany(
                { slotId: { $in: slotIds }, status: { $in: [BOOKING_STATUS.UPCOMING, BOOKING_STATUS.ACTIVE] } },
                { $set: { status: BOOKING_STATUS.CANCELLED } },
                { session }
            );
        }

        const events = slotIds.map((slotId) => ({
            type: EVENTS.SLOT_STATUS_UPDATED,
            payload: { lotId, slotId, vendorId, status: statusTo },
        }));

        return { events, affectedBookings };
    });

    for (const event of events) await publishEvent(event.type, event.payload);
    for (const booking of affectedBookings) {
        await createNotification({
            userId: booking.userId,
            type: NOTIFICATION_TYPE.BOOKING_CANCELLED,
            title: "Booking cancelled",
            message: "Your booking was cancelled because the slot became unavailable.",
            metadata: { bookingId: booking._id, lotId, slotId: booking.slotId },
        });
    }
}
