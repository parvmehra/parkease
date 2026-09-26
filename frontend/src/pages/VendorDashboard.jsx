import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, LayoutGrid, CircleParking, CircleDot, CalendarClock, Wallet, Plus, Radio } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { Button } from "../components/Button.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { ErrorState } from "../components/ErrorState.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { Badge } from "../components/Badge.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useRealtime } from "../hooks/useRealtime.js";
import * as vendorService from "../services/vendor.js";
import { formatCurrency } from "../utils/currency.js";

function describeEvent(event) {
    switch (event.type) {
        case "booking.created":
            return `New ${event.payload.bookingType?.toLowerCase() || "online"} booking created`;
        case "booking.cancelled":
            return "A booking was cancelled";
        case "booking.started":
            return "A booking became active";
        case "booking.completed":
            return "A parking session completed";
        case "slot.status.updated":
            return `Slot marked ${event.payload.status?.toLowerCase()}`;
        default:
            return event.type;
    }
}

export function VendorDashboard() {
    const navigate = useNavigate();
    const [feed, setFeed] = useState([]);
    const { data: overview, loading: overviewLoading, error: overviewError, refetch: refetchOverview } = useAsync(
        () => vendorService.getOverview(),
        []
    );
    const { data: lots, loading: lotsLoading, error: lotsError, refetch: refetchLots } = useAsync(() => vendorService.getMyLots(), []);

    useRealtime({
        onEvent: (event) => {
            if (event.type === "connection.ready") return;
            setFeed((current) => [{ ...event, id: Date.now() }, ...current].slice(0, 8));
            refetchOverview();
            refetchLots();
        },
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-ink">Vendor dashboard</h1>
                <Button onClick={() => navigate("/vendor/upload")}>
                    <Plus size={16} />
                    New parking lot
                </Button>
            </div>

            {overviewLoading && <LoadingSpinner label="Loading overview…" />}
            {overviewError && <ErrorState message={overviewError.message} onRetry={refetchOverview} />}
            {overview && (
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <StatCard label="Parking lots" value={overview.totalLots} icon={Building2} />
                    <StatCard label="Total slots" value={overview.totalSlots} icon={LayoutGrid} />
                    <StatCard label="Available now" value={overview.availableSlots} icon={CircleParking} />
                    <StatCard label="Occupied now" value={overview.occupiedSlots} icon={CircleDot} />
                    <StatCard label="Today's bookings" value={overview.todaysBookings} icon={CalendarClock} />
                    <StatCard label="Active sessions" value={overview.activeSessions} icon={CircleDot} />
                    <StatCard label="Today's revenue" value={formatCurrency(overview.todaysRevenue)} icon={Wallet} />
                </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="font-semibold text-ink">Your lots</h2>
                    {lotsLoading && <LoadingSpinner label="Loading lots…" />}
                    {lotsError && <ErrorState message={lotsError.message} onRetry={refetchLots} />}
                    {!lotsLoading && !lotsError && lots?.length === 0 && (
                        <EmptyState
                            icon={Building2}
                            title="No parking lots yet"
                            description="Upload a DXF layout to create your first lot."
                            action={<Button onClick={() => navigate("/vendor/upload")}>Upload a layout</Button>}
                        />
                    )}
                    {!lotsLoading &&
                        lots?.map((lot) => (
                            <Card key={lot._id} className="flex items-center justify-between p-4">
                                <div>
                                    <p className="font-medium text-ink">{lot.name}</p>
                                    <p className="text-sm text-ink-soft">
                                        {lot.meta?.location?.city} · {formatCurrency(lot.hourlyRates)}/hr
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge tone={lot.availableSlots === 0 ? "danger" : "brand"}>
                                        {lot.availableSlots ?? 0}/{lot.totalSlots ?? 0} available
                                    </Badge>
                                    <Button variant="secondary" onClick={() => navigate(`/vendor/lots/${lot._id}`)}>
                                        Manage
                                    </Button>
                                </div>
                            </Card>
                        ))}
                </div>

                <Card className="p-4">
                    <h2 className="flex items-center gap-2 font-semibold text-ink">
                        <Radio size={16} className="text-brand" />
                        Live activity
                    </h2>
                    <ul className="mt-3 space-y-2 text-sm">
                        {feed.length === 0 && <p className="text-ink-soft">Real-time events will appear here.</p>}
                        {feed.map((event) => (
                            <li key={event.id} className="rounded-lg border border-border px-3 py-2 text-ink-soft">
                                {describeEvent(event)}
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </div>
    );
}
