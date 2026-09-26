export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4444";
export const WS_BASE = import.meta.env.VITE_WS_BASE || "ws://localhost:4445";

export const ROLES = { CUSTOMER: "Customer", VENDOR: "Vendor" };

export const SLOT_STATUS = { AVAILABLE: "AVAILABLE", OCCUPIED: "OCCUPIED", UNAVAILABLE: "UNAVAILABLE" };

export const BOOKING_STATUS = { UPCOMING: "UPCOMING", ACTIVE: "ACTIVE", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED" };

export const BOOKING_TYPE = { ONLINE: "ONLINE", MANUAL: "MANUAL" };

export const SLOT_TYPE_LABELS = {
    normal: "Normal",
    compact: "Compact",
    large: "Large",
    ev: "EV",
    accessible: "Accessible",
    other: "Other",
};

export const AUTH_STORAGE_KEY = "parkease_auth";
