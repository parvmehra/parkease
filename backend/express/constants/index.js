export const ROLES = Object.freeze({
    CUSTOMER: "Customer",
    VENDOR: "Vendor",
});

export const SLOT_STATUS = Object.freeze({
    AVAILABLE: "AVAILABLE",
    OCCUPIED: "OCCUPIED",
    UNAVAILABLE: "UNAVAILABLE",
});

export const SLOT_TYPE = Object.freeze({
    NORMAL: "normal",
    COMPACT: "compact",
    LARGE: "large",
    EV: "ev",
    ACCESSIBLE: "accessible",
    OTHER: "other",
});

export const BOOKING_STATUS = Object.freeze({
    UPCOMING: "UPCOMING",
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
});

export const BOOKING_TYPE = Object.freeze({
    ONLINE: "ONLINE",
    MANUAL: "MANUAL",
});

export const NOTIFICATION_TYPE = Object.freeze({
    BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
    BOOKING_CANCELLED: "BOOKING_CANCELLED",
    BOOKING_STARTED: "BOOKING_STARTED",
    BOOKING_COMPLETED: "BOOKING_COMPLETED",
    NEW_BOOKING: "NEW_BOOKING",
    SLOT_STATUS_CHANGED: "SLOT_STATUS_CHANGED",
    MANUAL_SESSION_COMPLETED: "MANUAL_SESSION_COMPLETED",
});

export const MIN_BOOKING_MINUTES = 15;
export const MANUAL_BOOKING_DURATION_HOURS = 4;
