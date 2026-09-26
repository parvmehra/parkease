import { Link, Outlet } from "react-router-dom";
import { ParkingSquare } from "lucide-react";
import { ToastStack } from "../components/Toast.jsx";

export function PublicLayout() {
    return (
        <div className="min-h-screen bg-surface">
            <header className="border-b border-border bg-surface-raised">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                    <Link to="/" className="flex items-center gap-2 font-semibold text-ink">
                        <ParkingSquare size={20} className="text-brand" />
                        ParkEase
                    </Link>
                    <div className="flex items-center gap-3 text-sm">
                        <Link to="/login" className="text-ink-soft hover:text-ink">
                            Log in
                        </Link>
                        <Link to="/register" className="rounded-lg bg-brand px-3.5 py-2 font-medium text-white hover:bg-brand-dark">
                            Get started
                        </Link>
                    </div>
                </div>
            </header>
            <Outlet />
            <ToastStack />
        </div>
    );
}
