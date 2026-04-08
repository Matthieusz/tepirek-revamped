import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  className?: string;
  iconClassName?: string;
}

export const LoadingSpinner = ({
  className = "flex w-full items-center justify-center py-12",
  iconClassName = "size-8 animate-spin text-muted-foreground",
}: LoadingSpinnerProps) => (
  <div className={className}>
    <Loader2 className={iconClassName} />
  </div>
);
