import User from "../model/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

function toPublicUser(user) {
    return { id: user._id, username: user.username, email: user.email, type: user.type };
}

export const registerController = asyncHandler(async (req, res) => {
    const { username, email, password, type } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
        throw new AppError("Email already registered", 409, "EMAIL_TAKEN");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, email, password: hashedPassword, type });

    return res.status(201).json({ success: true, message: "User registered successfully", user: toPublicUser(newUser) });
});

export const loginController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const token = jwt.sign({ userId: user._id, role: user.type }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

    return res.status(200).json({ success: true, message: "Login successful", token, user: toPublicUser(user) });
});
