import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Button } from "../components/Button.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { ErrorState } from "../components/ErrorState.jsx";
import { SlotMap, defaultSlotColor } from "../components/SlotMap.jsx";
import { SlotLegend } from "../components/SlotLegend.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useRealtime } from "../hooks/useRealtime.js";
import { useToast } from "../hooks/useToast.js";
import * as customerService from "../services/customer.js";
import { formatCurrency } from "../utils/currency.js";
import { durationLabel } from "../utils/date.js";
import { SLOT_STATUS } from "../utils/constants.js";

export function ParkingLotDetails() {
    const { lotId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const toast = useToast();

    const start = params.get("start");
    const end = params.get("end");
    const startISO = useMemo(() => new Date(start).toISOString(), [start]);
    const endISO = useMemo(() => new Date(end).toISOString(), [end]);

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [confirming, setConfirming] = useState(false);

    const { data, loading, error, refetch } = useAsync(
        () => customerService.getLotAvailability(lotId, { startTimeVar: startISO, endTimeVar: endISO }),
        [lotId, startISO, endISO]
    );

    useRealtime({ lotId, onEvent: (event) => { if (event.type === "slot.status.updated") refetch(); } });

    function toggleSlot(slot) {
        if (slot.status === SLOT_STATUS.OCCUPIED) return toast.push("That slot is already booked", "error");
        if (slot.status === SLOT_STATUS.UNAVAILABLE) return toast.push("That slot is unavailable", "error");
        setSelectedIds((current) => {
            const next = new Set(current);
            next.has(slot._id) ? next.delete(slot._id) : next.add(slot._id);
            return next;
        });
    }

    async function confirmBooking() {
        setConfirming(true);
        try {
            const bookings = await customerService.createBooking(lotId, {
                slotids: [...selectedIds],
                startTimeVar: startISO,
                endTimeVar: endISO,
            });
            const total = bookings.reduce((sum, b) => sum + b.amount, 0);
            toast.push(`Booking confirmed — ${formatCurrency(total)} for ${bookings.length} slot(s)`);
            navigate("/app/bookings");
        } catch (err) {
            toast.push(err.message, "error");
        } finally {
            setConfirming(false);
        }
    }

    if (loading) return <LoadingSpinner label="Loading parking layout…" />;
    if (error) return <ErrorState message={error.message} onRetry={refetch} />;

    const hourlyRate = state?.lot?.hourlyRates;
    const hours = (new Date(endISO) - new Date(startISO)) / 3600000;
    const estimate = hourlyRate ? Math.ceil(hours) * hourlyRate * selectedIds.size : null;

    return (
        <div className="space-y-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
                <ArrowLeft size={16} />
                Back to search
            </button>

            <div>
                <h1 className="text-xl font-semibold text-ink">{state?.lot?.name || data.boundary.name}</h1>
                {state?.lot?.meta?.location && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
                        <MapPin size={14} />
                        {state.lot.meta.location.addressLine}, {state.lot.meta.location.city}
                    </p>
                )}
                <p className="text-sm text-ink-soft">
                    {new Date(startISO).toLocaleString()} · {durationLabel(startISO, endISO)}
                </p>
            </div>

            <Card className="p-4">
                <SlotMap
                    boundary={data.boundary}
                    slots={data.slots}
                    colorForSlot={(slot) => defaultSlotColor(slot, { selected: selectedIds.has(slot._id) })}
                    onSlotClick={toggleSlot}
                />
                <div className="mt-3">
                    <SlotLegend />
                </div>
            </Card>

            {selectedIds.size > 0 && (
                <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                        <p className="text-sm text-ink-soft">{selectedIds.size} slot(s) selected</p>
                        {estimate !== null && <p className="text-lg font-semibold text-ink">{formatCurrency(estimate)}</p>}
                    </div>
                    <Button onClick={confirmBooking} loading={confirming}>
                        Confirm booking
                    </Button>
                </Card>
            )}
        </div>
    );
}
