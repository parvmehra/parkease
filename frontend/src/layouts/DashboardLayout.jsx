import { NavLink, Outlet } from "react-router-dom";
import { LogOut, ParkingSquare } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { LiveStatusPill } from "../components/LiveStatusPill.jsx";
import { NotificationBell } from "../components/NotificationBell.jsx";
import { useRealtime } from "../hooks/useRealtime.js";
import { ToastStack } from "../components/Toast.jsx";

const linkClass = ({ isActive }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive ? "bg-brand-soft text-brand-dark" : "text-ink-soft hover:bg-surface hover:text-ink"
    }`;

export function DashboardLayout({ navItems }) {
    const { user, logout } = useAuth();
    const status = useRealtime();

    return (
        <div className="min-h-screen bg-surface">
            <header className="border-b border-border bg-surface-raised">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                        <ParkingSquare size={20} className="text-brand" />
                        ParkEase
                    </div>
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="flex items-center gap-3">
                        <LiveStatusPill status={status} />
                        <NotificationBell />
                        <span className="text-sm text-ink-soft">{user?.username}</span>
                        <button onClick={logout} className="text-ink-soft hover:text-danger" title="Log out">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-6">
                <Outlet />
            </main>
            <ToastStack />
        </div>
    );
}
