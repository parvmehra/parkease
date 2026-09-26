import { MapPin, ChevronRight } from "lucide-react";
import { Card } from "./Card.jsx";
import { Badge } from "./Badge.jsx";
import { formatCurrency } from "../utils/currency.js";

export function ParkingLotCard({ lot, onSelect }) {
    const full = lot.availableSlots === 0;
    return (
        <Card className="p-4 transition-shadow hover:shadow-sm">
            <button onClick={() => onSelect(lot)} className="flex w-full items-start justify-between gap-3 text-left">
                <div>
                    <p className="font-semibold text-ink">{lot.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
                        <MapPin size={14} />
                        {lot.meta?.location?.area || lot.meta?.location?.addressLine}, {lot.meta?.location?.city}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <Badge tone={full ? "danger" : "brand"}>
                            {lot.availableSlots ?? 0}/{lot.totalSlots ?? 0} available
                        </Badge>
                        <span className="text-sm text-ink-soft">{formatCurrency(lot.hourlyRates)}/hr</span>
                    </div>
                </div>
                <ChevronRight size={18} className="mt-1 shrink-0 text-ink-soft" />
            </button>
        </Card>
    );
}
