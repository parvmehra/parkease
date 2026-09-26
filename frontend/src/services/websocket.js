import { WS_BASE } from "../utils/constants.js";

export function connectRealtime({ token, lotId, onEvent, onStatusChange }) {
    let socket = null;
    let reconnectTimer = null;
    let closedByCaller = false;

    function open() {
        const params = new URLSearchParams({ token });
        if (lotId) params.set("lotId", lotId);
        socket = new WebSocket(`${WS_BASE}?${params.toString()}`);

        socket.onopen = () => onStatusChange?.("online");
        socket.onclose = () => {
            onStatusChange?.("offline");
            if (!closedByCaller) reconnectTimer = setTimeout(open, 3000);
        };
        socket.onerror = () => socket.close();
        socket.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                onEvent?.(parsed);
            } catch {
                // ignore malformed frames
            }
        };
    }

    open();

    return function disconnect() {
        closedByCaller = true;
        clearTimeout(reconnectTimer);
        socket?.close();
    };
}
