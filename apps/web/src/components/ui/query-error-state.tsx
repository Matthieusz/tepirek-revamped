import type { ReactNode } from "react";

import { Button } from "./button";

/** Displays a recoverable query failure and lets the caller retry the request. */
export const QueryErrorState = ({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}): ReactNode => (
  <div
    aria-live="assertive"
    className="border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 rounded-xl border p-6 text-center"
    role="alert"
  >
    <p className="text-destructive text-sm">{message}</p>
    <Button onClick={onRetry} size="sm" variant="outline">
      Spróbuj ponownie
    </Button>
  </div>
);
