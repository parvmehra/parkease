import { z } from "zod";

export const uploadLotSchema = z.object({
    name: z.string().trim().min(2, "Lot name is required"),
    description: z.string().trim().optional(),
    units: z.enum(["mm", "m", "cm", "ft", "inches", "km"]).optional(),
    hourlyRates: z.coerce.number().positive("Hourly rate must be a positive number"),
    addressLine: z.string().trim().min(1, "Address is required"),
    area: z.string().trim().optional(),
    city: z.string().trim().min(1, "City is required"),
    state: z.string().trim().min(1, "State is required"),
    pincode: z.string().trim().min(1, "Pincode is required"),
});
