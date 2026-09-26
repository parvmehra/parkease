import parkingLot from "../model/parkingLotModel.js";
import Booking from "../model/bookingModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getLotSlotStatuses, getAvailabilityCounts } from "../services/availabilityService.js";
import { getVendorOverview } from "../services/vendorOverviewService.js";
import { getVendorAnalytics } from "../services/vendorAnalyticsService.js";
import { createManualBooking, completeManualBooking } from "../services/bookingService.js";
import { changeSlotAvailability, createSlot, updateSlot, deleteSlot } from "../services/slotService.js";

export const viewAllLots = asyncHandler(async (req, res) => {
    const lots = await parkingLot.find({ createdBy: req.user.userId }).select("-boundary").lean();
    if (lots.length > 0) {
        const now = new Date();
        const countsFor = await getAvailabilityCounts(lots.map((lot) => lot._id), now, now);
        for (const lot of lots) {
            const counts = countsFor(lot._id);
            lot.totalSlots = counts.totalSlots;
            lot.availableSlots = counts.availableSlots;
        }
    }
    return res.status(200).json({ success: true, data: lots });
});

export const viewOverview = asyncHandler(async (req, res) => {
    const overview = await getVendorOverview(req.user.userId);
    return res.status(200).json({ success: true, data: overview });
});

export const viewAnalytics = asyncHandler(async (req, res) => {
    const analytics = await getVendorAnalytics(req.user.userId, { days: 7 });
    return res.status(200).json({ success: true, data: analytics });
});

export const viewLot = asyncHandler(async (req, res) => {
    return res.status(200).json({ success: true, data: req.lot });
});

export const displayCurrent = asyncHandler(async (req, res) => {
    const lot = req.lot;
    const now = new Date();
    const slots = await getLotSlotStatuses(lot._id, now, now);

    return res.status(200).json({
        success: true,
        data: { boundary: { name: lot.name, units: lot.units, vertices: lot.boundary }, slots },
    });
});

export const manualBooking = asyncHandler(async (req, res) => {
    const booking = await createManualBooking({ vendorId: req.user.userId, lotId: req.lot._id, slotId: req.params.slotId });
    return res.status(201).json({ success: true, message: "Manual booking successful", data: booking });
});

export const manualComplete = asyncHandler(async (req, res) => {
    const booking = await completeManualBooking({ vendorId: req.user.userId, lotId: req.lot._id, slotId: req.params.slotId });
    return res.status(200).json({ success: true, message: "Manual booking ended successfully", data: booking });
});

export const changeAvailability = asyncHandler(async (req, res) => {
    const { slotIds, statusto } = req.body;
    await changeSlotAvailability({ vendorId: req.user.userId, lotId: req.lot._id, slotIds, statusTo: statusto });
    return res.status(200).json({ success: true, message: "Slot availability updated" });
});

export const addSlot = asyncHandler(async (req, res) => {
    const slot = await createSlot({ vendorId: req.user.userId, lotId: req.lot._id, ...req.body });
    return res.status(201).json({ success: true, message: "Slot created", data: slot });
});

export const editSlot = asyncHandler(async (req, res) => {
    const slot = await updateSlot({ vendorId: req.user.userId, lotId: req.lot._id, slotId: req.params.slotId, updates: req.body });
    return res.status(200).json({ success: true, message: "Slot updated", data: slot });
});

export const removeSlot = asyncHandler(async (req, res) => {
    await deleteSlot({ vendorId: req.user.userId, lotId: req.lot._id, slotId: req.params.slotId });
    return res.status(200).json({ success: true, message: "Slot deleted" });
});

export const viewLotBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ lotId: req.lot._id })
        .populate("userId", "username email type")
        .populate("slotId", "name slotType status")
        .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: bookings });
});
