export function formatDateTime(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
}

export function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function toDatetimeInputValue(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function durationLabel(startTime, endTime) {
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.round((ms % 3600000) / 60000);
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
}
