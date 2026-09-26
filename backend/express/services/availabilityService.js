import mongoose from "mongoose";
import parkingSlot from "../model/parkingSlot.js";
import { BOOKING_STATUS, SLOT_STATUS } from "../constants/index.js";

function overlapLookupStage(startTime, endTime) {
    return {
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
                                { $lt: ["$startTime", endTime] },
                                { $gt: ["$endTime", startTime] },
                            ],
                        },
                    },
                },
                { $limit: 1 },
            ],
            as: "overlaps",
        },
    };
}

export async function getAvailabilityCounts(lotIds, startTime, endTime) {
    const ids = lotIds.map((id) => new mongoose.Types.ObjectId(id));
    const rows = await parkingSlot.aggregate([
        { $match: { lotId: { $in: ids } } },
        overlapLookupStage(startTime, endTime),
        {
            $addFields: {
                isAvailable: {
                    $and: [{ $eq: ["$status", SLOT_STATUS.AVAILABLE] }, { $eq: [{ $size: "$overlaps" }, 0] }],
                },
            },
        },
        {
            $group: {
                _id: "$lotId",
                totalSlots: { $sum: 1 },
                availableSlots: { $sum: { $cond: ["$isAvailable", 1, 0] } },
            },
        },
    ]);

    const byLotId = new Map(rows.map((row) => [String(row._id), row]));
    return (lotId) => byLotId.get(String(lotId)) || { totalSlots: 0, availableSlots: 0 };
}

export async function getLotSlotStatuses(lotId, startTime, endTime) {
    const id = new mongoose.Types.ObjectId(lotId);
    const slots = await parkingSlot.aggregate([
        { $match: { lotId: id } },
        overlapLookupStage(startTime, endTime),
        {
            $project: {
                name: 1,
                vertices: 1,
                slotType: 1,
                currentbookingId: 1,
                bookingType: { $arrayElemAt: ["$overlaps.bookingType", 0] },
                status: {
                    $cond: [
                        { $eq: ["$status", SLOT_STATUS.UNAVAILABLE] },
                        SLOT_STATUS.UNAVAILABLE,
                        {
                            $cond: [
                                { $or: [{ $eq: ["$status", SLOT_STATUS.OCCUPIED] }, { $gt: [{ $size: "$overlaps" }, 0] }] },
                                SLOT_STATUS.OCCUPIED,
                                SLOT_STATUS.AVAILABLE,
                            ],
                        },
                    ],
                },
            },
        },
    ]);
    return slots;
}
