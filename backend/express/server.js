import "dotenv/config";
import express from "express";
import cors from "cors";
import dbconnect from "./db/dbconnect.js";
import { env } from "./config/env.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import userRoutes from "./routes/userRoutes.js";
import vendorRoutes from "./routes/vendorRoutes.js";
import canvasRoutes from "./routes/canvasRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

const app = express();
app.use(cors({ origin: env.clientUrl }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.send("home page");
});

app.use("/api/users", userRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/canvas", canvasRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/notifications", notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

if (env.nodeEnv !== "test") {
    await dbconnect();
    const { schedulingJob } = await import("./extras/scheduling.js");
    schedulingJob();
    app.listen(env.port, () => {
        console.log(`Server started on port ${env.port}`);
    });
}

export default app;
