import { apiClient } from "./api.js";

export function getOverview() {
    return apiClient.get("/api/vendors/overview");
}

export function getMyLots() {
    return apiClient.get("/api/vendors/lots");
}

export function getLot(lotId) {
    return apiClient.get(`/api/vendors/lot/${lotId}`);
}

export function getLotLayout(lotId) {
    return apiClient.get(`/api/vendors/lot/display/${lotId}`);
}

export function getLotBookings(lotId) {
    return apiClient.get(`/api/vendors/lot/${lotId}/bookings`);
}

export function changeSlotAvailability(lotId, { slotIds, statusto }) {
    return apiClient.patch(`/api/vendors/lot/changestatus/${lotId}`, { slotIds, statusto });
}

export function startManualBooking(lotId, slotId) {
    return apiClient.patch(`/api/vendors/lot/manualbooking/${lotId}/${slotId}`);
}

export function completeManualBooking(lotId, slotId) {
    return apiClient.patch(`/api/vendors/lot/manualcomplete/${lotId}/${slotId}`);
}

export function createSlot(lotId, { name, slotType, vertices }) {
    return apiClient.post(`/api/vendors/lot/${lotId}/slots`, { name, slotType, vertices });
}

export function updateSlot(lotId, slotId, updates) {
    return apiClient.patch(`/api/vendors/lot/${lotId}/slots/${slotId}`, updates);
}

export function deleteSlot(lotId, slotId) {
    return apiClient.delete(`/api/vendors/lot/${lotId}/slots/${slotId}`);
}

export function getAnalytics() {
    return apiClient.get("/api/vendors/analytics");
}

export function uploadLot(formData) {
    return apiClient.post("/api/vendors/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
}
