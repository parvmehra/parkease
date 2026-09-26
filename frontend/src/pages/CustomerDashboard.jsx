import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, CalendarCheck, Clock, History } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Input } from "../components/Input.jsx";
import { Button } from "../components/Button.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { ErrorState } from "../components/ErrorState.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { ParkingLotCard } from "../components/ParkingLotCard.jsx";
import { useAsync } from "../hooks/useAsync.js";
import * as customerService from "../services/customer.js";
import { toDatetimeInputValue } from "../utils/date.js";
import { BOOKING_STATUS } from "../utils/constants.js";

function defaultWindow() {
    const start = new Date();
    start.setMinutes(start.getMinutes() + 15);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start: toDatetimeInputValue(start), end: toDatetimeInputValue(end) };
}

export function CustomerDashboard() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const defaults = useMemo(defaultWindow, []);
    const [form, setForm] = useState({
        q: params.get("q") || "",
        start: params.get("start") || defaults.start,
        end: params.get("end") || defaults.end,
        maxRate: params.get("maxRate") || "",
    });

    const { data: bookings } = useAsync(() => customerService.getMyBookings(), []);
    const { data: lots, loading, error, refetch } = useAsync(
        () =>
            customerService.searchLots({
                start: new Date(form.start).toISOString(),
                end: form.end ? new Date(form.end).toISOString() : undefined,
                q: form.q || undefined,
            }),
        [form.start, form.end, form.q]
    );

    const visibleLots = useMemo(() => {
        if (!lots) return lots;
        const maxRate = Number(form.maxRate);
        if (!maxRate) return lots;
        return lots.filter((lot) => lot.hourlyRates <= maxRate);
    }, [lots, form.maxRate]);

    function handleSearch(event) {
        event.preventDefault();
        setParams({ q: form.q, start: form.start, end: form.end, maxRate: form.maxRate });
        refetch();
    }

    const upcomingCount = bookings?.filter((b) => b.status === BOOKING_STATUS.UPCOMING).length ?? 0;
    const activeCount = bookings?.filter((b) => b.status === BOOKING_STATUS.ACTIVE).length ?? 0;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Upcoming bookings" value={upcomingCount} icon={CalendarCheck} />
                <StatCard label="Active right now" value={activeCount} icon={Clock} />
                <StatCard label="Total bookings" value={bookings?.length ?? 0} icon={History} />
            </div>

            <Card className="p-5">
                <h2 className="font-semibold text-ink">Find parking</h2>
                <form onSubmit={handleSearch} className="mt-4 grid gap-3 sm:grid-cols-5">
                    <Input
                        label="Name, area, or city"
                        placeholder="Search parking lots"
                        value={form.q}
                        onChange={(e) => setForm({ ...form, q: e.target.value })}
                    />
                    <Input
                        label="Start"
                        type="datetime-local"
                        required
                        value={form.start}
                        onChange={(e) => setForm({ ...form, start: e.target.value })}
                    />
                    <Input label="End" type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
                    <Input
                        label="Max ₹/hr"
                        type="number"
                        min="0"
                        placeholder="Any price"
                        value={form.maxRate}
                        onChange={(e) => setForm({ ...form, maxRate: e.target.value })}
                    />
                    <Button type="submit" className="self-end">
                        <Search size={16} />
                        Search
                    </Button>
                </form>
            </Card>

            {loading && <LoadingSpinner label="Searching parking lots…" />}
            {error && <ErrorState message={error.message} onRetry={refetch} />}
            {!loading && !error && visibleLots?.length === 0 && (
                <EmptyState icon={Search} title="No lots found" description="Try a different search or time window." />
            )}
            {!loading && !error && visibleLots?.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleLots.map((lot) => (
                        <ParkingLotCard
                            key={lot._id}
                            lot={lot}
                            onSelect={(selected) =>
                                navigate(`/app/lots/${selected._id}?start=${encodeURIComponent(form.start)}&end=${encodeURIComponent(form.end)}`, {
                                    state: { lot: selected },
                                })
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
