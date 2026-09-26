import parkingLot from "../model/parkingLotModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const loadOwnedLot = asyncHandler(async (req, res, next) => {
    const lotId = req.params.lotid || req.params.lotId;
    const lot = await parkingLot.findOne({ _id: lotId, createdBy: req.user.userId });
    if (!lot) {
        return res.status(404).json({ success: false, message: "Lot not found or not associated with this vendor", code: "LOT_NOT_FOUND" });
    }
    req.lot = lot;
    next();
});
