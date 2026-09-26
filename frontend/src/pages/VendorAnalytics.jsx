import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { Card } from "../components/Card.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { ErrorState } from "../components/ErrorState.jsx";
import { EmptyState } from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import * as vendorService from "../services/vendor.js";
import { formatCurrency } from "../utils/currency.js";
import { BarChart3 } from "lucide-react";

const STATUS_COLORS = {
    UPCOMING: "#0f7a52",
    ACTIVE: "#a9760a",
    COMPLETED: "#4b5566",
    CANCELLED: "#b3432b",
};

function formatDay(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatHour(hour) {
    return `${String(hour).padStart(2, "0")}:00`;
}

export function VendorAnalytics() {
    const { data, loading, error, refetch } = useAsync(() => vendorService.getAnalytics(), []);

    if (loading) return <LoadingSpinner label="Loading analytics…" />;
    if (error) return <ErrorState message={error.message} onRetry={refetch} />;

    const hasData = data.bookingsByDay.length > 0;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-ink">Analytics</h1>
                <p className="text-sm text-ink-soft">Bookings and revenue across your parking lots over the last 7 days.</p>
            </div>

            {!hasData && (
                <EmptyState icon={BarChart3} title="Not enough data yet" description="Charts will appear once bookings start coming in." />
            )}

            {hasData && (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="p-4">
                            <h2 className="mb-3 text-sm font-semibold text-ink">Bookings by day</h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.bookingsByDay}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e2dd" />
                                    <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip labelFormatter={formatDay} />
                                    <Bar dataKey="bookings" fill="#0f7a52" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-4">
                            <h2 className="mb-3 text-sm font-semibold text-ink">Revenue by day</h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.revenueByDay}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e2dd" />
                                    <XAxis dataKey="date" tickFormatter={formatDay} tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip labelFormatter={formatDay} formatter={(value) => formatCurrency(value)} />
                                    <Bar dataKey="revenue" fill="#0b5c3d" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-4">
                            <h2 className="mb-3 text-sm font-semibold text-ink">Booking status distribution</h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie data={data.statusDistribution} dataKey="count" nameKey="status" innerRadius={50} outerRadius={80} paddingAngle={2}>
                                        {data.statusDistribution.map((row) => (
                                            <Cell key={row.status} fill={STATUS_COLORS[row.status] || "#94a3b8"} />
                                        ))}
                                    </Pie>
                                    <Legend />
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-4">
                            <h2 className="mb-3 text-sm font-semibold text-ink">Bookings by hour of day</h2>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={data.occupancyByHour}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e2dd" />
                                    <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 12 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                    <Tooltip labelFormatter={formatHour} />
                                    <Bar dataKey="bookings" fill="#0f7a52" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    <Card className="p-4">
                        <h2 className="mb-3 text-sm font-semibold text-ink">Top performing lots</h2>
                        <div className="space-y-2">
                            {data.topLots.map((lot) => (
                                <div key={lot.lotId} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                                    <span className="text-ink">{lot.name}</span>
                                    <span className="text-ink-soft">
                                        {lot.bookings} bookings · {formatCurrency(lot.revenue)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
