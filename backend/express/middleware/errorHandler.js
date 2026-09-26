import { AppError } from "../utils/AppError.js";

export function notFoundHandler(req, res) {
    res.status(404).json({ success: false, message: "Route not found", code: "NOT_FOUND" });
}

export function errorHandler(err, req, res, next) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code });
    }

    if (err.name === "ValidationError") {
        return res.status(400).json({ success: false, message: err.message, code: "VALIDATION_ERROR" });
    }

    if (err.name === "MulterError") {
        return res.status(400).json({ success: false, message: err.message, code: "UPLOAD_ERROR" });
    }

    if (err.name === "CastError") {
        return res.status(400).json({ success: false, message: "Invalid identifier supplied", code: "INVALID_ID" });
    }

    if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "A record with these details already exists", code: "DUPLICATE" });
    }

    console.error("Unhandled error:", err);
    return res.status(500).json({ success: false, message: "Internal server error", code: "INTERNAL_ERROR" });
}
