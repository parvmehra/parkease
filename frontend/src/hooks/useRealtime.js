import { useEffect, useRef, useState } from "react";
import { connectRealtime } from "../services/websocket.js";
import { useAuth } from "./useAuth.js";

export function useRealtime({ lotId, onEvent } = {}) {
    const { token, isAuthenticated } = useAuth();
    const [status, setStatus] = useState("offline");
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    useEffect(() => {
        if (!isAuthenticated) return;
        const disconnect = connectRealtime({
            token,
            lotId,
            onStatusChange: setStatus,
            onEvent: (event) => onEventRef.current?.(event),
        });
        return disconnect;
    }, [isAuthenticated, token, lotId]);

    return status;
}
