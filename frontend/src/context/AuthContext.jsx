import { createContext, useCallback, useMemo, useState } from "react";
import * as authService from "../services/auth.js";
import { AUTH_STORAGE_KEY } from "../utils/constants.js";

export const AuthContext = createContext(null);

function readStoredAuth() {
    try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }) {
    const [auth, setAuth] = useState(readStoredAuth);

    const persist = useCallback((value) => {
        setAuth(value);
        if (value) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
        else localStorage.removeItem(AUTH_STORAGE_KEY);
    }, []);

    const login = useCallback(
        async (credentials) => {
            const result = await authService.login(credentials);
            persist({ token: result.token, user: result.user });
            return result.user;
        },
        [persist]
    );

    const register = useCallback(async (payload) => {
        const result = await authService.register(payload);
        return result.user;
    }, []);

    const logout = useCallback(() => persist(null), [persist]);

    const value = useMemo(
        () => ({ user: auth?.user ?? null, token: auth?.token ?? null, isAuthenticated: Boolean(auth?.token), login, register, logout }),
        [auth, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
