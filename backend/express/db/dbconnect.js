import mongoose from "mongoose";
import { env } from "../config/env.js";

const dbconnect = async () => {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");
};

export default dbconnect;
