import axios from "axios";
import { API_BASE, AUTH_STORAGE_KEY } from "../utils/constants.js";

export class ApiError extends Error {
    constructor(message, code, status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

export const apiClient = axios.create({ baseURL: API_BASE });

apiClient.interceptors.request.use((config) => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
        const { token } = JSON.parse(stored);
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response.data?.data ?? response.data,
    (error) => {
        const payload = error.response?.data;
        const message = payload?.message || error.message || "Something went wrong";
        const code = payload?.code || "UNKNOWN_ERROR";
        return Promise.reject(new ApiError(message, code, error.response?.status));
    }
);
