export function LiveStatusPill({ status }) {
    const online = status === "online";
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-ink-soft">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-brand" : "bg-ink-soft/40"}`} />
            {online ? "Live" : "Offline"}
        </span>
    );
}
