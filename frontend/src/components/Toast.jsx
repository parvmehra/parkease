import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "../hooks/useToast.js";

export function ToastStack() {
    const { toasts, dismiss } = useToast();

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <button
                    key={toast.id}
                    onClick={() => dismiss(toast.id)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left text-sm shadow-sm ${
                        toast.variant === "error" ? "border-danger/20 bg-danger-soft text-danger" : "border-brand/20 bg-brand-soft text-brand-dark"
                    }`}
                >
                    {toast.variant === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                    {toast.message}
                </button>
            ))}
        </div>
    );
}
