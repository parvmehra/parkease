import mongoose from "mongoose";
import { ROLES } from "../constants/index.js";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(ROLES),
            default: ROLES.CUSTOMER,
        },
    },
    { timestamps: true }
);

const user = mongoose.models.user || mongoose.model("user", userSchema);
export default user;
