import { apiClient } from "./api.js";

export function searchLots({ start, end, city, q }) {
    const params = { start };
    if (end) params.end = end;
    if (city) params.city = city;
    if (q) params.q = q;
    return apiClient.get("/api/customers/showlots", { params });
}

export function getLotAvailability(lotId, { startTimeVar, endTimeVar }) {
    return apiClient.post(`/api/canvas/display/${lotId}/availability`, { startTimeVar, endTimeVar });
}

export function createBooking(lotId, { slotids, startTimeVar, endTimeVar }) {
    return apiClient.post(`/api/customers/bookslot/${lotId}`, { slotids, startTimeVar, endTimeVar });
}

export function getMyBookings() {
    return apiClient.get("/api/customers/mybookings");
}

export function cancelBooking(bookingId) {
    return apiClient.patch(`/api/customers/cancelbooking/${bookingId}`);
}
