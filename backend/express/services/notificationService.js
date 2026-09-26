import Notification from "../model/notificationModel.js";
import { publishEvent } from "./notifications.js";
import { EVENTS } from "../../shared/events.js";

export async function createNotification({ userId, type, title, message, metadata = {} }) {
    const notification = await Notification.create({ userId, type, title, message, metadata });
    await publishEvent(EVENTS.NOTIFICATION_CREATED, { userId, notification });
    return notification;
}

export async function listNotifications(userId, { limit = 30 } = {}) {
    const [items, unreadCount] = await Promise.all([
        Notification.find({ userId }).sort({ createdAt: -1 }).limit(limit),
        Notification.countDocuments({ userId, read: false }),
    ]);
    return { items, unreadCount };
}

export async function markNotificationRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate({ _id: notificationId, userId }, { read: true }, { new: true });
    return notification;
}

export async function markAllNotificationsRead(userId) {
    await Notification.updateMany({ userId, read: false }, { read: true });
}
