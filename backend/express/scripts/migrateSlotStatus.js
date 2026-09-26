import "dotenv/config";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import parkingSlot from "../model/parkingSlot.js";
import { SLOT_STATUS } from "../constants/index.js";

const LEGACY_STATUS_MAP = {
    avaliable: SLOT_STATUS.AVAILABLE,
    available: SLOT_STATUS.AVAILABLE,
    booked: SLOT_STATUS.OCCUPIED,
    occupied: SLOT_STATUS.OCCUPIED,
    unavaliable: SLOT_STATUS.UNAVAILABLE,
    unavailable: SLOT_STATUS.UNAVAILABLE,
};

async function migrate() {
    await mongoose.connect(env.mongoUri);
    const collection = mongoose.connection.collection("parkingslots");

    let totalUpdated = 0;
    for (const [legacyValue, newValue] of Object.entries(LEGACY_STATUS_MAP)) {
        const result = await collection.updateMany({ status: legacyValue }, { $set: { status: newValue } });
        totalUpdated += result.modifiedCount;
    }

    console.log(`Migrated ${totalUpdated} parking slot document(s) to the new status values.`);
    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
});
