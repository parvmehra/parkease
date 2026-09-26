import mongoose from "mongoose";
import { BOOKING_STATUS, BOOKING_TYPE } from "../constants/index.js";

const bookingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "user",
        },
        slotId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "parkingSlot",
        },
        lotId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "parkingLot",
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(BOOKING_STATUS),
            default: BOOKING_STATUS.UPCOMING,
        },
        bookingType: {
            type: String,
            enum: Object.values(BOOKING_TYPE),
            default: BOOKING_TYPE.ONLINE,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { timestamps: true }
);

bookingSchema.index({ slotId: 1, status: 1, startTime: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ lotId: 1 });

const Booking = mongoose.models.booking || mongoose.model("booking", bookingSchema);
export default Booking;
