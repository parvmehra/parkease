import { Badge } from "./Badge.jsx";
import { Button } from "./Button.jsx";
import { formatDateTime } from "../utils/date.js";
import { formatCurrency } from "../utils/currency.js";

const STATUS_TONE = { UPCOMING: "brand", ACTIVE: "warning", COMPLETED: "neutral", CANCELLED: "danger" };

export function BookingTable({ bookings, showCustomer = false, onCancel }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-surface text-left text-ink-soft">
                    <tr>
                        {showCustomer && <th className="px-4 py-3 font-medium">Customer</th>}
                        <th className="px-4 py-3 font-medium">Lot</th>
                        <th className="px-4 py-3 font-medium">Slot</th>
                        <th className="px-4 py-3 font-medium">Start</th>
                        <th className="px-4 py-3 font-medium">End</th>
                        <th className="px-4 py-3 font-medium">Amount</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        {onCancel && <th className="px-4 py-3" />}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {bookings.map((booking) => (
                        <tr key={booking._id}>
                            {showCustomer && <td className="px-4 py-3">{booking.userId?.username || "—"}</td>}
                            <td className="px-4 py-3">{booking.lotId?.name || "—"}</td>
                            <td className="px-4 py-3">{booking.slotId?.name || "—"}</td>
                            <td className="px-4 py-3">{formatDateTime(booking.startTime)}</td>
                            <td className="px-4 py-3">{formatDateTime(booking.endTime)}</td>
                            <td className="px-4 py-3">{formatCurrency(booking.amount)}</td>
                            <td className="px-4 py-3">{booking.bookingType}</td>
                            <td className="px-4 py-3">
                                <Badge tone={STATUS_TONE[booking.status]}>{booking.status}</Badge>
                            </td>
                            {onCancel && (
                                <td className="px-4 py-3 text-right">
                                    {booking.status === "UPCOMING" && (
                                        <Button variant="ghost" className="px-2 py-1 text-danger" onClick={() => onCancel(booking)}>
                                            Cancel
                                        </Button>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
