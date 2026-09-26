import { asyncHandler } from "../utils/asyncHandler.js";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "../services/notificationService.js";

export const viewNotifications = asyncHandler(async (req, res) => {
    const { items, unreadCount } = await listNotifications(req.user.userId);
    return res.status(200).json({ success: true, data: { items, unreadCount } });
});

export const markRead = asyncHandler(async (req, res) => {
    const notification = await markNotificationRead(req.user.userId, req.params.notificationId);
    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found", code: "NOTIFICATION_NOT_FOUND" });
    }
    return res.status(200).json({ success: true, data: notification });
});

export const markAllRead = asyncHandler(async (req, res) => {
    await markAllNotificationsRead(req.user.userId);
    return res.status(200).json({ success: true, message: "All notifications marked as read" });
});
