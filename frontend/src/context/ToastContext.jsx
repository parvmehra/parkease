import { createContext, useCallback, useMemo, useState } from "react";

export const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const push = useCallback(
        (message, variant = "success") => {
            const id = nextId++;
            setToasts((current) => [...current, { id, message, variant }]);
            setTimeout(() => dismiss(id), 4000);
        },
        [dismiss]
    );

    const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

    return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
