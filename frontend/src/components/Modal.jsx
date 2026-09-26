import { X } from "lucide-react";

export function Modal({ title, onClose, children }) {
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
            <div className="w-full max-w-md rounded-xl border border-border bg-surface-raised shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                    <h2 className="font-semibold text-ink">{title}</h2>
                    <button onClick={onClose} className="text-ink-soft hover:text-ink">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
