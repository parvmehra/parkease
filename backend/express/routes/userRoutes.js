import { Router } from "express";
import { registerController, loginController } from "../controllers/userContoller.js";
import { validate } from "../validators/validate.js";
import { registerSchema, loginSchema } from "../validators/authValidators.js";

const router = Router();

router.get("/time", (req, res) => {
    res.status(200).json({ success: true, now: new Date().toISOString() });
});
router.post("/login", validate(loginSchema), loginController);
router.post("/register", validate(registerSchema), registerController);

export default router;
