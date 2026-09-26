import mongoose from "mongoose";
import { SLOT_STATUS, SLOT_TYPE } from "../constants/index.js";

const slotSchema = new mongoose.Schema(
    {
        lotId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "parkingLot",
        },
        name: {
            type: String,
            default: "",
        },
        vertices: {
            type: [
                {
                    x: { type: Number, required: true },
                    y: { type: Number, required: true },
                },
            ],
            _id: false,
        },
        slotType: {
            type: String,
            enum: Object.values(SLOT_TYPE),
            default: SLOT_TYPE.NORMAL,
        },
        status: {
            type: String,
            enum: Object.values(SLOT_STATUS),
            default: SLOT_STATUS.AVAILABLE,
        },
        currentbookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "booking",
            default: null,
        },
        reservationSeq: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

slotSchema.index({ lotId: 1, status: 1 });

const parkingSlot = mongoose.models.parkingSlot || mongoose.model("parkingSlot", slotSchema);

export default parkingSlot;
