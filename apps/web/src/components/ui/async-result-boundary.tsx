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
const AsyncResultBoundaryContent = ({
  children,
  onRetry,
  result,
}: AsyncResultBoundaryProps<unknown, unknown>): ReactNode => {
  return AsyncResult.builder(result)
    .onWaiting((current) => {
      if (AsyncResult.isSuccess(current)) {
        return (
          <div className="relative w-full">
            {children(current.value)}
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
    })
    .onInitial(() => <LoadingSpinner />)
    .onSuccess((value) => children(value))
    .onError((error) => (
      <AsyncResultFailure
        message={getErrorMessage(
          error,
          "Nie udało się wczytać danych. Spróbuj ponownie."
        )}
        onRetry={onRetry}
      />
    ))
    .onDefect((defect) => (
      <AsyncResultFailure
        message={getErrorMessage(
          defect,
          "Nie udało się wczytać danych. Spróbuj ponownie."
        )}
        onRetry={onRetry}
      />
    ))
    .onInterrupt(() => (
      <AsyncResultFailure
        message="Wczytywanie danych zostało przerwane. Spróbuj ponownie."
        onRetry={onRetry}
      />
    ))
    .exhaustive();
};

export const AsyncResultBoundary = <A, E>(
  props: AsyncResultBoundaryProps<A, E>
): ReactNode => {
  // SAFETY: The result and callback keep the same A/E pair at this boundary.
  const contentProps: AsyncResultBoundaryProps<unknown, unknown> = {
    children: (value) => props.children(value as A),
    onRetry: props.onRetry,
    result: props.result as AsyncResult.AsyncResult<unknown, unknown>,
  };
  return <AsyncResultBoundaryContent {...contentProps} />;
};
