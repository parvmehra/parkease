import { apiClient } from "./api.js";

export function getNotifications() {
    return apiClient.get("/api/notifications");
}

export function markNotificationRead(notificationId) {
    return apiClient.patch(`/api/notifications/${notificationId}/read`);
}

export function markAllNotificationsRead() {
    return apiClient.patch("/api/notifications/read-all");
}
