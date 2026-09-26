import { z } from "zod";
import { SLOT_TYPE } from "../constants/index.js";

const vertex = z.object({ x: z.number(), y: z.number() });

export const createSlotSchema = z.object({
    name: z.string().trim().min(1, "Slot name is required"),
    slotType: z.enum(Object.values(SLOT_TYPE)).optional(),
    vertices: z.array(vertex).min(3, "A slot needs at least 3 vertices"),
});

export const updateSlotSchema = z.object({
    name: z.string().trim().min(1).optional(),
    slotType: z.enum(Object.values(SLOT_TYPE)).optional(),
    vertices: z.array(vertex).min(3).optional(),
});
