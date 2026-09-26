import parkingLot from "../model/parkingLotModel.js";
import Booking from "../model/bookingModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { getAvailabilityCounts } from "../services/availabilityService.js";
import { createOnlineBooking, cancelBooking } from "../services/bookingService.js";

export const showLots = asyncHandler(async (req, res) => {
    const { start, end, city, q } = req.query;
    if (!start) throw new AppError("start time is required", 400, "MISSING_START");

    const query = { isActive: true };
    if (city) query["meta.location.city"] = new RegExp(`^${city}$`, "i");
    if (q) {
        const pattern = new RegExp(q.trim(), "i");
        query.$or = [{ name: pattern }, { "meta.location.area": pattern }, { "meta.location.city": pattern }];
    }

    const lots = await parkingLot.find(query, "name description boundary meta hourlyRates").lean();
    if (lots.length === 0) {
        return res.status(200).json({ success: true, data: [] });
    }

    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date(startTime.getTime() + 24 * 60 * 60 * 1000);

    const countsFor = await getAvailabilityCounts(lots.map((lot) => lot._id), startTime, endTime);
    for (const lot of lots) {
        const counts = countsFor(lot._id);
        lot.totalSlots = counts.totalSlots;
        lot.availableSlots = counts.availableSlots;
    }

    return res.status(200).json({ success: true, data: lots });
});

export const bookingSlot = asyncHandler(async (req, res) => {
    const { lotid } = req.params;
    const { slotids, startTimeVar, endTimeVar } = req.body;

    const bookings = await createOnlineBooking({
        userId: req.user.userId,
        lotId: lotid,
        slotIds: slotids,
        startTime: startTimeVar,
        endTime: endTimeVar,
    });

    return res.status(201).json({ success: true, message: "Bookings created successfully", data: bookings });
});

export const viewBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ userId: req.user.userId })
        .populate("slotId", "name slotType status")
        .populate("lotId", "name hourlyRates meta.location")
        .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: bookings });
});

export const cancelbooking = asyncHandler(async (req, res) => {
    const booking = await cancelBooking({ userId: req.user.userId, bookingId: req.params.bookingid });
    return res.status(200).json({ success: true, message: "Booking cancelled successfully", data: booking });
});
