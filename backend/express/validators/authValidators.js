import { z } from "zod";
import { ROLES } from "../constants/index.js";

export const registerSchema = z.object({
    username: z.string().trim().min(2, "Username must be at least 2 characters"),
    email: z.string().trim().email("A valid email is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    type: z.enum(Object.values(ROLES)).optional(),
});

export const loginSchema = z.object({
    email: z.string().trim().email("A valid email is required"),
    password: z.string().min(1, "Password is required"),
});
