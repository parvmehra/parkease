export function Card({ className = "", children, ...props }) {
    return (
        <div className={`rounded-xl border border-border bg-surface-raised ${className}`} {...props}>
            {children}
        </div>
    );
}
