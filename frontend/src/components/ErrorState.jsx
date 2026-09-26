import { AlertTriangle } from "lucide-react";
import { Button } from "./Button.jsx";

export function ErrorState({ message = "Something went wrong.", onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-danger/20 bg-danger-soft py-10 text-center">
            <AlertTriangle size={24} className="text-danger" />
            <p className="text-sm text-danger">{message}</p>
            {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                    Try again
                </Button>
            )}
        </div>
    );
}
