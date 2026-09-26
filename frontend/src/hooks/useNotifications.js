import { useCallback, useEffect, useState } from "react";
import * as notificationService from "../services/notifications.js";
import { useRealtime } from "./useRealtime.js";
import { useAuth } from "./useAuth.js";

export function useNotifications() {
    const { user, isAuthenticated } = useAuth();
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const load = useCallback(async () => {
        if (!isAuthenticated) return;
        const result = await notificationService.getNotifications();
        setItems(result.items);
        setUnreadCount(result.unreadCount);
    }, [isAuthenticated]);

    useEffect(() => {
        load();
    }, [load]);

    useRealtime({
        onEvent: (event) => {
            if (event.type !== "notification.created") return;
            if (String(event.payload.userId) !== String(user?.id)) return;
            setItems((current) => [event.payload.notification, ...current].slice(0, 30));
            setUnreadCount((count) => count + 1);
        },
    });

    async function markRead(notificationId) {
        await notificationService.markNotificationRead(notificationId);
        setItems((current) => current.map((item) => (item._id === notificationId ? { ...item, read: true } : item)));
        setUnreadCount((count) => Math.max(0, count - 1));
    }

    async function markAllRead() {
        await notificationService.markAllNotificationsRead();
        setItems((current) => current.map((item) => ({ ...item, read: true })));
        setUnreadCount(0);
    }

    return { items, unreadCount, markRead, markAllRead, refetch: load };
}
