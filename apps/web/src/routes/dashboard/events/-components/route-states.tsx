import type { ErrorComponentProps } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getErrorMessage } from "@/lib/errors";

export const EventsRoutePending = () => <LoadingSpinner />;

export const EventsRouteError = ({ error, reset }: ErrorComponentProps) => (
  <div
    aria-live="assertive"
    className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
    role="alert"
  >
    <p className="text-destructive text-sm">
      {getErrorMessage(
        error,
        "Nie udało się wczytać strony. Spróbuj ponownie."
      )}
    </p>
    <Button onClick={reset} size="sm" variant="outline">
      Spróbuj ponownie
    </Button>
  </div>
);
