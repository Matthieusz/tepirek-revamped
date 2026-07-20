import * as Cause from "effect/Cause";
import * as Result from "effect/Result";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { ReactNode } from "react";

import { getErrorMessage } from "@/lib/errors";

import { Button } from "./button";
import { LoadingSpinner } from "./loading-spinner";

interface AsyncResultBoundaryProps<A, E> {
  readonly children: (value: A) => ReactNode;
  readonly onRetry: () => void;
  readonly result: AsyncResult.AsyncResult<A, E>;
}

export const AsyncResultFailure = ({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) => (
  <div
    aria-live="assertive"
    className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
    role="alert"
  >
    <p className="text-destructive text-sm">{message}</p>
    <Button onClick={onRetry} size="sm" variant="outline">
      Spróbuj ponownie
    </Button>
  </div>
);

/** Renders every AsyncResult lifecycle without treating failures as empty data. */
const AsyncResultBoundaryContent = <A, E>({
  children,
  onRetry,
  result,
}: AsyncResultBoundaryProps<A, E>): ReactNode => {
  if (result.waiting) {
    if (AsyncResult.isSuccess(result)) {
      return (
        <div className="relative w-full">
          {children(result.value)}
          <p
            aria-live="polite"
            className="absolute top-full w-full pt-2 text-center text-muted-foreground text-xs"
          >
            Odświeżanie…
          </p>
        </div>
      );
    }

    return <LoadingSpinner />;
  }

  if (AsyncResult.isInitial(result)) {
    return <LoadingSpinner />;
  }

  if (AsyncResult.isSuccess(result)) {
    return children(result.value);
  }

  const error = Cause.findError(result.cause);
  if (Result.isSuccess(error)) {
    return (
      <AsyncResultFailure
        message={getErrorMessage(
          error.success,
          "Nie udało się wczytać danych. Spróbuj ponownie."
        )}
        onRetry={onRetry}
      />
    );
  }

  const defect = Cause.findDefect(result.cause);
  if (Result.isSuccess(defect)) {
    return (
      <AsyncResultFailure
        message={getErrorMessage(
          defect.success,
          "Nie udało się wczytać danych. Spróbuj ponownie."
        )}
        onRetry={onRetry}
      />
    );
  }

  return (
    <AsyncResultFailure
      message="Wczytywanie danych zostało przerwane. Spróbuj ponownie."
      onRetry={onRetry}
    />
  );
};

export const AsyncResultBoundary = <A, E>(
  props: AsyncResultBoundaryProps<A, E>
): ReactNode => <AsyncResultBoundaryContent {...props} />;
