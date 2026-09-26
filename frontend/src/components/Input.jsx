export function Input({ label, error, className = "", ...props }) {
    return (
        <label className="block text-sm">
            {label && <span className="mb-1.5 block font-medium text-ink">{label}</span>}
            <input
                className={`w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 ${className}`}
                {...props}
            />
            {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
        </label>
    );
}
