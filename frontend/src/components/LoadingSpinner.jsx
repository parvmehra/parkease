import { Loader2 } from "lucide-react";

export function LoadingSpinner({ label = "Loading…", className = "" }) {
    return (
        <div className={`flex items-center justify-center gap-2 py-10 text-sm text-ink-soft ${className}`}>
            <Loader2 size={18} className="animate-spin" />
            {label}
        </div>
    );
}
