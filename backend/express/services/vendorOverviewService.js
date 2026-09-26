import mongoose from "mongoose";
import parkingLot from "../model/parkingLotModel.js";
import parkingSlot from "../model/parkingSlot.js";
import Booking from "../model/bookingModel.js";
import { BOOKING_STATUS, SLOT_STATUS } from "../constants/index.js";

export async function getVendorOverview(vendorId) {
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const lots = await parkingLot.find({ createdBy: vendorObjectId }).select("_id").lean();
    const lotIds = lots.map((lot) => lot._id);

    if (lotIds.length === 0) {
        return { totalLots: 0, totalSlots: 0, availableSlots: 0, occupiedSlots: 0, todaysBookings: 0, activeSessions: 0, todaysRevenue: 0 };
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [slotCounts, todaysBookings, activeSessions, revenueRows] = await Promise.all([
        parkingSlot.aggregate([
            { $match: { lotId: { $in: lotIds } } },
            {
                $lookup: {
                    from: "bookings",
                    let: { slotId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$slotId", "$$slotId"] },
                                        { $in: ["$status", [BOOKING_STATUS.UPCOMING, BOOKING_STATUS.ACTIVE]] },
                                        { $lte: ["$startTime", now] },
                                        { $gt: ["$endTime", now] },
                                    ],
                                },
                            },
                        },
                        { $limit: 1 },
                    ],
                    as: "overlaps",
                },
            },
            {
                $group: {
                    _id: null,
                    totalSlots: { $sum: 1 },
                    occupiedSlots: {
                        $sum: {
                            $cond: [{ $or: [{ $eq: ["$status", SLOT_STATUS.OCCUPIED] }, { $gt: [{ $size: "$overlaps" }, 0] }] }, 1, 0],
                        },
                    },
                    unavailableSlots: { $sum: { $cond: [{ $eq: ["$status", SLOT_STATUS.UNAVAILABLE] }, 1, 0] } },
                },
            },
        ]),
        Booking.countDocuments({ lotId: { $in: lotIds }, startTime: { $gte: startOfDay, $lt: endOfDay }, status: { $ne: BOOKING_STATUS.CANCELLED } }),
        Booking.countDocuments({ lotId: { $in: lotIds }, status: BOOKING_STATUS.ACTIVE }),
        Booking.aggregate([
            { $match: { lotId: { $in: lotIds }, startTime: { $gte: startOfDay, $lt: endOfDay }, status: { $ne: BOOKING_STATUS.CANCELLED } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
    ]);

    const counts = slotCounts[0] || { totalSlots: 0, occupiedSlots: 0, unavailableSlots: 0 };
    const availableSlots = counts.totalSlots - counts.occupiedSlots - counts.unavailableSlots;

    return {
        totalLots: lotIds.length,
        totalSlots: counts.totalSlots,
        availableSlots,
        occupiedSlots: counts.occupiedSlots,
        todaysBookings,
        activeSessions,
        todaysRevenue: revenueRows[0]?.total || 0,
    };
}
