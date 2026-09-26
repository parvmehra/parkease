import { apiClient } from "./api.js";

export function register(payload) {
    return apiClient.post("/api/users/register", payload);
}

export function login(payload) {
    return apiClient.post("/api/users/login", payload);
}

export function fetchServerTime() {
    return apiClient.get("/api/users/time");
}
