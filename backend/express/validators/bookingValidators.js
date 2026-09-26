import { z } from "zod";
import { SLOT_STATUS } from "../constants/index.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid identifier");
const isoDate = z.coerce.date({ error: "A valid date/time is required" });

export const createBookingSchema = z.object({
    slotids: z.array(objectId).min(1, "At least one slot is required"),
    startTimeVar: isoDate,
    endTimeVar: isoDate,
});

export const changeAvailabilitySchema = z.object({
    slotIds: z.array(objectId).min(1, "At least one slot is required"),
    statusto: z.enum([SLOT_STATUS.AVAILABLE, SLOT_STATUS.UNAVAILABLE]),
});
