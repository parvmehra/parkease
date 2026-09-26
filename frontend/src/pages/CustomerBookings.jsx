import { useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { ErrorState } from "../components/ErrorState.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { BookingTable } from "../components/BookingTable.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useToast } from "../hooks/useToast.js";
import * as customerService from "../services/customer.js";
import { BOOKING_STATUS } from "../utils/constants.js";

const TABS = [
    { key: "ALL", label: "All" },
    { key: BOOKING_STATUS.UPCOMING, label: "Upcoming" },
    { key: BOOKING_STATUS.ACTIVE, label: "Active" },
    { key: BOOKING_STATUS.COMPLETED, label: "Completed" },
    { key: BOOKING_STATUS.CANCELLED, label: "Cancelled" },
];

export function CustomerBookings() {
    const [tab, setTab] = useState("ALL");
    const toast = useToast();
    const { data: bookings, loading, error, refetch } = useAsync(() => customerService.getMyBookings(), []);

    const filtered = useMemo(() => {
        if (!bookings) return [];
        return tab === "ALL" ? bookings : bookings.filter((b) => b.status === tab);
    }, [bookings, tab]);

    async function handleCancel(booking) {
        try {
            await customerService.cancelBooking(booking._id);
            toast.push("Booking cancelled");
            refetch();
        } catch (err) {
            toast.push(err.message, "error");
        }
    }

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-semibold text-ink">My bookings</h1>
            <div className="flex gap-1 border-b border-border">
                {TABS.map((item) => (
                    <button
                        key={item.key}
                        onClick={() => setTab(item.key)}
                        className={`border-b-2 px-3 py-2 text-sm font-medium ${
                            tab === item.key ? "border-brand text-brand-dark" : "border-transparent text-ink-soft hover:text-ink"
                        }`}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {loading && <LoadingSpinner label="Loading bookings…" />}
            {error && <ErrorState message={error.message} onRetry={refetch} />}
            {!loading && !error && filtered.length === 0 && (
                <EmptyState icon={CalendarX2} title="No bookings here" description="Bookings you make will show up in this tab." />
            )}
            {!loading && !error && filtered.length > 0 && <BookingTable bookings={filtered} onCancel={handleCancel} />}
        </div>
    );
}
