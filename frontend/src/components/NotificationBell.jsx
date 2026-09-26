import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications.js";
import { formatDateTime } from "../utils/date.js";

export function NotificationBell() {
    const { items, unreadCount, markRead, markAllRead } = useNotifications();
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setOpen((value) => !value)}
                className="relative rounded-lg p-2 text-ink-soft hover:bg-surface hover:text-ink"
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <button className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} aria-hidden="true" />
                    <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-border bg-surface-raised shadow-lg">
                        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                            <p className="text-sm font-semibold text-ink">Notifications</p>
                            {unreadCount > 0 && (
                                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-brand hover:underline">
                                    <CheckCheck size={13} />
                                    Mark all read
                                </button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {items.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-soft">No notifications yet.</p>}
                            {items.map((item) => (
                                <button
                                    key={item._id}
                                    onClick={() => !item.read && markRead(item._id)}
                                    className={`block w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface ${
                                        item.read ? "" : "bg-brand-soft/40"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-ink">{item.title}</p>
                                        {!item.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                                    </div>
                                    <p className="mt-0.5 text-xs text-ink-soft">{item.message}</p>
                                    <p className="mt-1 text-[11px] text-ink-soft/70">{formatDateTime(item.createdAt)}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
