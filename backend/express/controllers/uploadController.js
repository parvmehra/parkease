import DXFParser from "dxf-parser";
import parkingLot from "../model/parkingLotModel.js";
import parkingSlot from "../model/parkingSlot.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

function extractBoundary(entities) {
    return entities.find((entity) => entity.type === "LWPOLYLINE" && entity.layer?.toLowerCase() === "boundary" && Array.isArray(entity.vertices));
}

function extractSlotEntities(entities) {
    return entities.filter((entity) => entity.type === "LWPOLYLINE" && entity.layer?.toLowerCase() === "parkinglot" && Array.isArray(entity.vertices));
}

export const parseAndCreateParkingLot = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new AppError("DXF file is required", 400, "FILE_REQUIRED");
    }

    const vendorId = req.user.userId;
    const { name, description, units, hourlyRates, addressLine, area, city, state, pincode } = req.body;

    const existingLot = await parkingLot.findOne({ createdBy: vendorId, name });
    if (existingLot) {
        throw new AppError("Parking lot with same name already exists", 409, "DUPLICATE_LOT_NAME");
    }

    let dxfJson;
    try {
        dxfJson = new DXFParser().parseSync(req.file.buffer.toString("utf-8"));
    } catch {
        throw new AppError("Invalid DXF file", 400, "INVALID_DXF");
    }

    const boundary = extractBoundary(dxfJson.entities);
    if (!boundary) {
        throw new AppError("DXF file is missing a boundary layer", 400, "MISSING_BOUNDARY");
    }

    const newLot = await parkingLot.create({
        name,
        description,
        createdBy: vendorId,
        units,
        boundary: boundary.vertices,
        hourlyRates,
        meta: { location: { addressLine, area, city, state, pincode } },
    });

    const slotEntities = extractSlotEntities(dxfJson.entities);
    if (slotEntities.length > 0) {
        await parkingSlot.insertMany(
            slotEntities.map((entity, index) => ({
                lotId: newLot._id,
                name: `S${index + 1}`,
                vertices: entity.vertices,
            }))
        );
    }

    return res.status(201).json({ success: true, message: "Parking lot and slots created successfully", data: { lotId: newLot._id } });
});
