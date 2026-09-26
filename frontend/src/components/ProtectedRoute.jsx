import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function ProtectedRoute({ role, children }) {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (role && user?.type !== role) {
        return <Navigate to={user?.type === "Vendor" ? "/vendor" : "/app"} replace />;
    }
    return children;
}
