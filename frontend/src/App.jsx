import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout.jsx";
import { DashboardLayout } from "./layouts/DashboardLayout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { LoadingSpinner } from "./components/LoadingSpinner.jsx";
import { Landing } from "./pages/Landing.jsx";
import { Login } from "./pages/Login.jsx";
import { Register } from "./pages/Register.jsx";
import { CustomerDashboard } from "./pages/CustomerDashboard.jsx";
import { CustomerBookings } from "./pages/CustomerBookings.jsx";
import { ParkingLotDetails } from "./pages/ParkingLotDetails.jsx";
import { VendorDashboard } from "./pages/VendorDashboard.jsx";
import { VendorLotDetails } from "./pages/VendorLotDetails.jsx";
import { VendorUploadLot } from "./pages/VendorUploadLot.jsx";
import { ROLES } from "./utils/constants.js";

const VendorAnalytics = lazy(() => import("./pages/VendorAnalytics.jsx").then((m) => ({ default: m.VendorAnalytics })));

const CUSTOMER_NAV = [
    { to: "/app", label: "Find parking", end: true },
    { to: "/app/bookings", label: "My bookings" },
];

const VENDOR_NAV = [
    { to: "/vendor", label: "Dashboard", end: true },
    { to: "/vendor/analytics", label: "Analytics" },
];

export default function App() {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Route>

            <Route
                path="/app"
                element={
                    <ProtectedRoute role={ROLES.CUSTOMER}>
                        <DashboardLayout navItems={CUSTOMER_NAV} />
                    </ProtectedRoute>
                }
            >
                <Route index element={<CustomerDashboard />} />
                <Route path="bookings" element={<CustomerBookings />} />
                <Route path="lots/:lotId" element={<ParkingLotDetails />} />
            </Route>

            <Route
                path="/vendor"
                element={
                    <ProtectedRoute role={ROLES.VENDOR}>
                        <DashboardLayout navItems={VENDOR_NAV} />
                    </ProtectedRoute>
                }
            >
                <Route index element={<VendorDashboard />} />
                <Route
                    path="analytics"
                    element={
                        <Suspense fallback={<LoadingSpinner label="Loading analytics…" />}>
                            <VendorAnalytics />
                        </Suspense>
                    }
                />
                <Route path="upload" element={<VendorUploadLot />} />
                <Route path="lots/:lotId" element={<VendorLotDetails />} />
            </Route>
        </Routes>
    );
}
