import mongoose from "mongoose";

const lotSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
        },
        units: {
            type: String,
            default: "mm",
            enum: ["mm", "m", "cm", "ft", "inches", "km"],
        },
        boundary: {
            type: [
                {
                    x: { type: Number, required: true },
                    y: { type: Number, required: true },
                },
            ],
            _id: false,
        },
        hourlyRates: {
            type: Number,
            required: true,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        meta: {
            location: {
                addressLine: { type: String, required: true },
                area: { type: String, default: "" },
                city: { type: String, required: true },
                state: { type: String, required: true },
                pincode: { type: String, required: true },
            },
        },
    },
    { timestamps: true }
);

lotSchema.index({ createdBy: 1 });
lotSchema.index({ "meta.location.city": 1 });

const parkingLot = mongoose.models.parkingLot || mongoose.model("parkingLot", lotSchema);
export default parkingLot;
