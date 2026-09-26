import { Card } from "./Card.jsx";

export function StatCard({ label, value, icon: Icon, hint }) {
    return (
        <Card className="p-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-ink-soft">{label}</p>
                    <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
                    {hint && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
                </div>
                {Icon && (
                    <div className="rounded-lg bg-brand-soft p-2 text-brand-dark">
                        <Icon size={18} />
                    </div>
                )}
            </div>
        </Card>
    );
}
