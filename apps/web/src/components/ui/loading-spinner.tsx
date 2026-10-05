import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  iconClassName?: string;
}

export const LoadingSpinner = ({
  className = "flex min-h-full w-full flex-1 flex-col items-center justify-center gap-2 py-12",
  iconClassName = "size-8 animate-spin text-muted-foreground",
}: LoadingSpinnerProps) => (
  <div aria-live="polite" className={className} role="status">
    <Loader2 aria-hidden="true" className={iconClassName} />
    <span className="text-muted-foreground text-sm">Ładowanie</span>
  </div>
);
