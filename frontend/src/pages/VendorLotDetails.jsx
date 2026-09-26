import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Minus, Trash2, Save, X } from "lucide-react";
import { Card } from "../components/Card.jsx";
import { Button } from "../components/Button.jsx";
import { Input } from "../components/Input.jsx";
import { Badge } from "../components/Badge.jsx";
import { LoadingSpinner } from "../components/LoadingSpinner.jsx";
import { ErrorState } from "../components/ErrorState.jsx";
import { SlotMap, defaultSlotColor } from "../components/SlotMap.jsx";
import { SlotLegend } from "../components/SlotLegend.jsx";
import { BookingTable } from "../components/BookingTable.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { useRealtime } from "../hooks/useRealtime.js";
import { useToast } from "../hooks/useToast.js";
import * as vendorService from "../services/vendor.js";
import { SLOT_STATUS, SLOT_TYPE_LABELS } from "../utils/constants.js";
import { getBoundingBox } from "../utils/canvas.js";

const SLOT_TYPES = Object.keys(SLOT_TYPE_LABELS);
const DEFAULT_SLOT_SIZE = 4;

function rectangleAt(centerX, centerY, width, height) {
    const halfW = width / 2;
    const halfH = height / 2;
    return [
        { x: centerX - halfW, y: centerY - halfH },
        { x: centerX + halfW, y: centerY - halfH },
        { x: centerX + halfW, y: centerY + halfH },
        { x: centerX - halfW, y: centerY + halfH },
    ];
}

function resizeVertices(vertices, dw, dh) {
    const box = getBoundingBox(vertices);
    const width = Math.max(1, box.width + dw);
    const height = Math.max(1, box.height + dh);
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;
    return rectangleAt(centerX, centerY, width, height).map((v) => ({ x: Math.round(v.x), y: Math.round(v.y) }));
}

export function VendorLotDetails() {
    const { lotId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const [tab, setTab] = useState("layout");
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [addMode, setAddMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: "", slotType: "" });

    const { data: lot } = useAsync(() => vendorService.getLot(lotId), [lotId]);
    const { data: layout, loading, error, refetch } = useAsync(() => vendorService.getLotLayout(lotId), [lotId]);
    const { data: bookings, refetch: refetchBookings } = useAsync(() => vendorService.getLotBookings(lotId), [lotId]);

    useRealtime({
        lotId,
        onEvent: (event) => {
            if (event.type === "connection.ready") return;
            refetch();
            refetchBookings();
        },
    });

    useEffect(() => {
        if (!layout) return;
        setSelectedSlot((current) => {
            if (!current) return current;
            return layout.slots.find((slot) => slot._id === current._id) || null;
        });
    }, [layout]);

    useEffect(() => {
        setEditForm({ name: selectedSlot?.name || "", slotType: selectedSlot?.slotType || "normal" });
    }, [selectedSlot?._id]);

    async function runAction(fn) {
        setActionLoading(true);
        try {
            await fn();
            await refetch();
            await refetchBookings();
        } catch (err) {
            toast.push(err.message, "error");
        } finally {
            setActionLoading(false);
        }
    }

    async function handleAddSlot(worldPos) {
        setAddMode(false);
        await runAction(async () => {
            const slot = await vendorService.createSlot(lotId, {
                name: `Slot ${layout.slots.length + 1}`,
                slotType: "normal",
                vertices: rectangleAt(worldPos.x, worldPos.y, DEFAULT_SLOT_SIZE, DEFAULT_SLOT_SIZE),
            });
            setSelectedSlot(slot);
        });
    }

    async function handleSlotMove(slot, newVertices) {
        await runAction(() => vendorService.updateSlot(lotId, slot._id, { vertices: newVertices }));
    }

    async function handleResize(dw, dh) {
        if (!selectedSlot) return;
        const newVertices = resizeVertices(selectedSlot.vertices, dw, dh);
        await runAction(() => vendorService.updateSlot(lotId, selectedSlot._id, { vertices: newVertices }));
    }

    async function handleSaveDetails() {
        if (!selectedSlot) return;
        await runAction(() => vendorService.updateSlot(lotId, selectedSlot._id, editForm));
        toast.push("Slot updated");
    }

    async function handleDelete() {
        if (!selectedSlot) return;
        await runAction(() => vendorService.deleteSlot(lotId, selectedSlot._id));
        setSelectedSlot(null);
        toast.push("Slot deleted");
    }

    return (
        <div className="space-y-4">
            <button onClick={() => navigate("/vendor")} className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
                <ArrowLeft size={16} />
                Back to dashboard
            </button>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-ink">{lot?.name || "Parking lot"}</h1>
                    {lot?.meta?.location && (
                        <p className="text-sm text-ink-soft">
                            {lot.meta.location.addressLine}, {lot.meta.location.city}
                        </p>
                    )}
                </div>
                {tab === "layout" && (
                    <Button
                        variant={editMode ? "primary" : "secondary"}
                        onClick={() => {
                            setEditMode((v) => !v);
                            setAddMode(false);
                        }}
                    >
                        <Pencil size={15} />
                        {editMode ? "Done editing" : "Edit layout"}
                    </Button>
                )}
            </div>

            <div className="flex gap-1 border-b border-border">
                {[
                    { key: "layout", label: "Layout & slots" },
                    { key: "bookings", label: "Bookings" },
                ].map((item) => (
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

            {tab === "layout" && (
                <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="p-4 lg:col-span-2">
                        {loading && <LoadingSpinner label="Loading layout…" />}
                        {error && <ErrorState message={error.message} onRetry={refetch} />}
                        {layout && (
                            <>
                                {editMode && (
                                    <div className="mb-3 flex items-center justify-between rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
                                        <span>{addMode ? "Click anywhere on the layout to place a new slot." : "Drag a slot to move it, or click one to select it."}</span>
                                        <Button variant={addMode ? "primary" : "secondary"} className="px-2 py-1 text-xs" onClick={() => setAddMode((v) => !v)}>
                                            <Plus size={14} />
                                            {addMode ? "Cancel" : "Add slot"}
                                        </Button>
                                    </div>
                                )}
                                <SlotMap
                                    boundary={layout.boundary}
                                    slots={layout.slots}
                                    colorForSlot={(slot) => defaultSlotColor(slot, { selected: selectedSlot?._id === slot._id })}
                                    onSlotClick={setSelectedSlot}
                                    onSlotMove={handleSlotMove}
                                    onAddSlot={handleAddSlot}
                                    editable={editMode}
                                    addMode={addMode}
                                />
                                <div className="mt-3">
                                    <SlotLegend />
                                </div>
                            </>
                        )}
                    </Card>

                    <Card className="p-4">
                        <h2 className="font-semibold text-ink">Slot details</h2>
                        {!selectedSlot && <p className="mt-2 text-sm text-ink-soft">Select a slot on the layout to manage it.</p>}
                        {selectedSlot && !editMode && (
                            <div className="mt-3 space-y-3">
                                <div>
                                    <p className="font-medium text-ink">{selectedSlot.name || "Unnamed slot"}</p>
                                    <p className="text-sm text-ink-soft">{SLOT_TYPE_LABELS[selectedSlot.slotType] || selectedSlot.slotType}</p>
                                    <Badge tone={selectedSlot.status === SLOT_STATUS.AVAILABLE ? "brand" : "danger"}>{selectedSlot.status}</Badge>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {selectedSlot.status === SLOT_STATUS.AVAILABLE && (
                                        <Button
                                            loading={actionLoading}
                                            onClick={() => runAction(() => vendorService.startManualBooking(lotId, selectedSlot._id))}
                                        >
                                            Start walk-in session
                                        </Button>
                                    )}
                                    {selectedSlot.status === SLOT_STATUS.OCCUPIED && selectedSlot.bookingType === "MANUAL" && (
                                        <Button
                                            loading={actionLoading}
                                            onClick={() => runAction(() => vendorService.completeManualBooking(lotId, selectedSlot._id))}
                                        >
                                            Complete session
                                        </Button>
                                    )}
                                    {selectedSlot.status !== SLOT_STATUS.UNAVAILABLE ? (
                                        <Button
                                            variant="secondary"
                                            loading={actionLoading}
                                            onClick={() =>
                                                runAction(() =>
                                                    vendorService.changeSlotAvailability(lotId, {
                                                        slotIds: [selectedSlot._id],
                                                        statusto: SLOT_STATUS.UNAVAILABLE,
                                                    })
                                                )
                                            }
                                        >
                                            Mark unavailable
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            loading={actionLoading}
                                            onClick={() =>
                                                runAction(() =>
                                                    vendorService.changeSlotAvailability(lotId, {
                                                        slotIds: [selectedSlot._id],
                                                        statusto: SLOT_STATUS.AVAILABLE,
                                                    })
                                                )
                                            }
                                        >
                                            Mark available
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                        {selectedSlot && editMode && (
                            <div className="mt-3 space-y-3">
                                <Input label="Slot number / name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                                <label className="block text-sm">
                                    <span className="mb-1.5 block font-medium text-ink">Slot type</span>
                                    <select
                                        value={editForm.slotType}
                                        onChange={(e) => setEditForm({ ...editForm, slotType: e.target.value })}
                                        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                                    >
                                        {SLOT_TYPES.map((type) => (
                                            <option key={type} value={type}>
                                                {SLOT_TYPE_LABELS[type]}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div>
                                    <span className="mb-1.5 block text-sm font-medium text-ink">Size</span>
                                    <div className="flex items-center gap-2">
                                        <Button variant="secondary" className="px-2 py-1" onClick={() => handleResize(-1, -1)} disabled={actionLoading}>
                                            <Minus size={14} />
                                        </Button>
                                        <span className="text-sm text-ink-soft">width × height</span>
                                        <Button variant="secondary" className="px-2 py-1" onClick={() => handleResize(1, 1)} disabled={actionLoading}>
                                            <Plus size={14} />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1" loading={actionLoading} onClick={handleSaveDetails}>
                                        <Save size={14} />
                                        Save
                                    </Button>
                                    <Button variant="danger" className="flex-1" loading={actionLoading} onClick={handleDelete}>
                                        <Trash2 size={14} />
                                        Delete
                                    </Button>
                                </div>
                                <Button variant="ghost" className="w-full" onClick={() => setSelectedSlot(null)}>
                                    <X size={14} />
                                    Deselect
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {tab === "bookings" && (bookings ? <BookingTable bookings={bookings} showCustomer /> : <LoadingSpinner label="Loading bookings…" />)}
        </div>
    );
}
