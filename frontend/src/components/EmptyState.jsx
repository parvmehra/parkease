export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
            {Icon && <Icon size={28} className="text-ink-soft" />}
            <p className="font-medium text-ink">{title}</p>
            {description && <p className="max-w-sm text-sm text-ink-soft">{description}</p>}
            {action}
        </div>
    );
}
