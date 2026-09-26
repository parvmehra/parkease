import parkingLot from "../model/parkingLotModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { getLotSlotStatuses } from "../services/availabilityService.js";

export const displayLot = asyncHandler(async (req, res) => {
    const { lotId } = req.params;
    const { startTimeVar, endTimeVar } = req.body;

    const lot = await parkingLot.findById(lotId);
    if (!lot) throw new AppError("Lot not found", 404, "LOT_NOT_FOUND");

    const slots = await getLotSlotStatuses(lotId, new Date(startTimeVar), new Date(endTimeVar));

    return res.status(200).json({
        success: true,
        data: { boundary: { name: lot.name, units: lot.units, vertices: lot.boundary }, slots },
    });
});
