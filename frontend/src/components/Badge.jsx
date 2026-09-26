const TONES = {
    neutral: "bg-surface text-ink-soft border-border",
    brand: "bg-brand-soft text-brand-dark border-brand/20",
    danger: "bg-danger-soft text-danger border-danger/20",
    warning: "bg-warning-soft text-warning border-warning/30",
};

export function Badge({ tone = "neutral", children }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
            {children}
        </span>
    );
}
