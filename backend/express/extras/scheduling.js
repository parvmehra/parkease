import cron from "node-cron";
import mongoose from "mongoose";
import Booking from "../model/bookingModel.js";
import parkingSlot from "../model/parkingSlot.js";
import parkingLot from "../model/parkingLotModel.js";
import { publisher } from "../../shared/index.js";
import { EVENTS } from "../../shared/events.js";
import { BOOKING_STATUS, SLOT_STATUS, NOTIFICATION_TYPE } from "../constants/index.js";
import { createNotification } from "../services/notificationService.js";

async function transitionBookings(now) {
    const session = await mongoose.startSession();
    const messages = [];
    const notifications = [];

    try {
        await session.withTransaction(async () => {
            const toComplete = await Booking.find({ status: BOOKING_STATUS.ACTIVE, endTime: { $lte: now } }).session(session);
            for (const booking of toComplete) {
                const slot = await parkingSlot.findByIdAndUpdate(
                    booking.slotId,
                    { status: SLOT_STATUS.AVAILABLE, currentbookingId: null },
                    { new: true, session }
                );
                const lot = await parkingLot.findById(slot.lotId).select("createdBy name").session(session);
                await Booking.findByIdAndUpdate(booking._id, { status: BOOKING_STATUS.COMPLETED }, { session });

                messages.push({ type: EVENTS.SLOT_STATUS_UPDATED, payload: { lotId: slot.lotId, slotId: slot._id, userId: booking.userId, bookingId: booking._id, vendorId: lot?.createdBy, status: SLOT_STATUS.AVAILABLE } });
                messages.push({ type: EVENTS.BOOKING_COMPLETED, payload: { lotId: slot.lotId, slotId: slot._id, userId: booking.userId, bookingId: booking._id, vendorId: lot?.createdBy, status: BOOKING_STATUS.COMPLETED } });
                notifications.push({
                    userId: booking.userId,
                    type: NOTIFICATION_TYPE.BOOKING_COMPLETED,
                    title: "Booking completed",
                    message: `Your parking session at ${lot?.name || "the lot"} has ended.`,
                    metadata: { bookingId: booking._id, lotId: slot.lotId },
                });
            }

            const toActivate = await Booking.find({ status: BOOKING_STATUS.UPCOMING, startTime: { $lte: now } }).session(session);
            for (const booking of toActivate) {
                const slot = await parkingSlot.findByIdAndUpdate(
                    booking.slotId,
                    { status: SLOT_STATUS.OCCUPIED, currentbookingId: booking._id },
                    { new: true, session }
                );
                const lot = await parkingLot.findById(slot.lotId).select("createdBy name").session(session);
                await Booking.findByIdAndUpdate(booking._id, { status: BOOKING_STATUS.ACTIVE }, { session });

                messages.push({ type: EVENTS.SLOT_STATUS_UPDATED, payload: { lotId: slot.lotId, slotId: slot._id, userId: booking.userId, bookingId: booking._id, vendorId: lot?.createdBy, status: SLOT_STATUS.OCCUPIED } });
                messages.push({ type: EVENTS.BOOKING_STARTED, payload: { lotId: slot.lotId, slotId: slot._id, userId: booking.userId, bookingId: booking._id, vendorId: lot?.createdBy, status: BOOKING_STATUS.ACTIVE } });
                notifications.push({
                    userId: booking.userId,
                    type: NOTIFICATION_TYPE.BOOKING_STARTED,
                    title: "Booking started",
                    message: `Your parking session at ${lot?.name || "the lot"} has started.`,
                    metadata: { bookingId: booking._id, lotId: slot.lotId },
                });
            }
        });

        for (const message of messages) {
            await publisher.publish(message.type, JSON.stringify(message.payload));
        }
        for (const notification of notifications) {
            await createNotification(notification);
        }
    } catch (err) {
        console.error("Error in booking status transition:", err.message);
    } finally {
        await session.endSession();
    }
}

export function schedulingJob() {
    cron.schedule("*/30 * * * * *", () => transitionBookings(new Date()));
}

export { transitionBookings };
