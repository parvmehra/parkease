import mongoose from "mongoose";
import parkingLot from "../model/parkingLotModel.js";
import Booking from "../model/bookingModel.js";
import { BOOKING_STATUS } from "../constants/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getVendorAnalytics(vendorId, { days = 7 } = {}) {
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const lots = await parkingLot.find({ createdBy: vendorObjectId }).select("_id name").lean();
    const lotIds = lots.map((lot) => lot._id);
    const lotNameById = new Map(lots.map((lot) => [String(lot._id), lot.name]));

    if (lotIds.length === 0) {
        return { bookingsByDay: [], revenueByDay: [], statusDistribution: [], occupancyByHour: [], topLots: [] };
    }

    const since = new Date(Date.now() - days * DAY_MS);

    const [byDay, statusDistribution, byHour, byLot] = await Promise.all([
        Booking.aggregate([
            { $match: { lotId: { $in: lotIds }, startTime: { $gte: since }, status: { $ne: BOOKING_STATUS.CANCELLED } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
                    bookings: { $sum: 1 },
                    revenue: { $sum: "$amount" },
                },
            },
            { $sort: { _id: 1 } },
        ]),
        Booking.aggregate([
            { $match: { lotId: { $in: lotIds }, startTime: { $gte: since } } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Booking.aggregate([
            { $match: { lotId: { $in: lotIds }, startTime: { $gte: since }, status: { $ne: BOOKING_STATUS.CANCELLED } } },
            { $group: { _id: { $hour: "$startTime" }, bookings: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
        Booking.aggregate([
            { $match: { lotId: { $in: lotIds }, startTime: { $gte: since }, status: { $ne: BOOKING_STATUS.CANCELLED } } },
            { $group: { _id: "$lotId", bookings: { $sum: 1 }, revenue: { $sum: "$amount" } } },
            { $sort: { revenue: -1 } },
        ]),
    ]);

    return {
        bookingsByDay: byDay.map((row) => ({ date: row._id, bookings: row.bookings, revenue: row.revenue })),
        revenueByDay: byDay.map((row) => ({ date: row._id, revenue: row.revenue })),
        statusDistribution: statusDistribution.map((row) => ({ status: row._id, count: row.count })),
        occupancyByHour: byHour.map((row) => ({ hour: row._id, bookings: row.bookings })),
        topLots: byLot.map((row) => ({ lotId: row._id, name: lotNameById.get(String(row._id)) || "Unknown lot", bookings: row.bookings, revenue: row.revenue })),
    };
}
