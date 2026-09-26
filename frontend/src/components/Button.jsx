const VARIANTS = {
    primary: "bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50",
    secondary: "bg-white text-ink border border-border hover:bg-surface disabled:opacity-50",
    danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
    ghost: "text-ink-soft hover:text-ink hover:bg-surface disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", loading = false, disabled, children, ...props }) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? "Please wait…" : children}
        </button>
    );
}
