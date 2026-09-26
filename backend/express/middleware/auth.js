import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/AppError.js";
import { ROLES } from "../constants/index.js";

export function authenticate(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ success: false, message: "Access token is required", code: "NO_TOKEN" });
    }

    jwt.verify(token, env.jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Invalid or expired token", code: "INVALID_TOKEN" });
        }
        req.user = decoded;
        next();
    });
}

export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "You do not have access to this resource", code: "FORBIDDEN" });
        }
        next();
    };
}

export const requireCustomer = requireRole(ROLES.CUSTOMER);
export const requireVendor = requireRole(ROLES.VENDOR);

export function unauthorized(message = "Unauthorized") {
    return new AppError(message, 403, "FORBIDDEN");
}
