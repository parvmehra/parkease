const ITEMS = [
    { color: "#29a66a", label: "Available" },
    { color: "#c7433b", label: "Occupied" },
    { color: "#2563eb", label: "Your booking" },
    { color: "#4b5563", label: "Unavailable" },
    { color: "#d99122", label: "Selected" },
];

export function SlotLegend({ items = ITEMS }) {
    return (
        <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
            {items.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                </span>
            ))}
        </div>
    );
}
