import { Router } from "express";
import multer from "multer";
import { parseAndCreateParkingLot } from "../controllers/uploadController.js";
import { authenticate, requireVendor } from "../middleware/auth.js";
import { loadOwnedLot } from "../middleware/ownership.js";
import { validate } from "../validators/validate.js";
import { uploadLotSchema } from "../validators/uploadValidators.js";
import { AppError } from "../utils/AppError.js";
import { changeAvailabilitySchema } from "../validators/bookingValidators.js";
import { createSlotSchema, updateSlotSchema } from "../validators/slotValidators.js";
import {
    viewAllLots,
    viewOverview,
    viewAnalytics,
    viewLot,
    displayCurrent,
    changeAvailability,
    manualComplete,
    manualBooking,
    viewLotBookings,
    addSlot,
    editSlot,
    removeSlot,
} from "../controllers/vendorController.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ["image/vnd.dxf", "application/dxf", "application/x-dxf", "application/x-autocad"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new AppError("Invalid file type. Only DXF files are allowed.", 400, "INVALID_FILE_TYPE"), false);
        }
    },
});

router.use(authenticate, requireVendor);

router.post("/upload/", upload.single("dxfFile"), validate(uploadLotSchema), parseAndCreateParkingLot);
router.get("/overview", viewOverview);
router.get("/analytics", viewAnalytics);
router.get("/lots", viewAllLots);
router.get("/lot/:lotid", loadOwnedLot, viewLot);
router.get("/lot/display/:lotid", loadOwnedLot, displayCurrent);
router.get("/lot/:lotid/bookings", loadOwnedLot, viewLotBookings);
router.patch("/lot/changestatus/:lotid", loadOwnedLot, validate(changeAvailabilitySchema), changeAvailability);
router.patch("/lot/manualbooking/:lotId/:slotId", loadOwnedLot, manualBooking);
router.patch("/lot/manualcomplete/:lotId/:slotId", loadOwnedLot, manualComplete);
router.post("/lot/:lotid/slots", loadOwnedLot, validate(createSlotSchema), addSlot);
router.patch("/lot/:lotid/slots/:slotId", loadOwnedLot, validate(updateSlotSchema), editSlot);
router.delete("/lot/:lotid/slots/:slotId", loadOwnedLot, removeSlot);

export default router;
