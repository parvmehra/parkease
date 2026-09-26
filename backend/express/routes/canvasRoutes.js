import { Router } from "express";
import { displayLot } from "../controllers/canvasController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

router.post("/display/:lotId/availability", authenticate, displayLot);

export default router;
