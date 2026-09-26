import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { viewNotifications, markRead, markAllRead } from "../controllers/notificationController.js";

const router = Router();

router.use(authenticate);

router.get("/", viewNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:notificationId/read", markRead);

export default router;
