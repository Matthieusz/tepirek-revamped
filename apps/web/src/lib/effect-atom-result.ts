import { Result } from "@effect-atom/atom-react";

import { getErrorMessage } from "@/lib/errors";

/** Explicit UI state for an Effect Atom Result. */
export type ResultViewState<A> =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Failure"; readonly message: string }
  | { readonly _tag: "Success"; readonly value: A };

/** Converts Effect Atom Result into an explicit UI state without leaking causes. */
export const resultViewState = <A>(
  result: Result.Result<A, unknown>
): ResultViewState<A> =>
  Result.matchWithWaiting(result, {
    onDefect: (defect) => ({
      _tag: "Failure",
      message: getErrorMessage(defect),
    }),
    onError: (error) => ({ _tag: "Failure", message: getErrorMessage(error) }),
    onSuccess: ({ value }) => ({ _tag: "Success", value }),
    onWaiting: () => ({ _tag: "Loading" }),
  });

/** Extracts successful Effect Atom resource data when available. */
export function resultValueOr<A>(
  result: Result.Result<A, unknown>
): A | undefined;
/** Extracts successful Effect Atom resource data with a stable fallback. */
export function resultValueOr<A>(
  result: Result.Result<A, unknown>,
  fallback: A
): A;
export function resultValueOr<A>(
  result: Result.Result<A, unknown>,
  fallback?: A
): A | undefined {
  const state = resultViewState(result);
  return state._tag === "Success" ? state.value : fallback;
}

/** True while an Effect Atom resource is waiting for its current value. */
export const resultIsLoading = (
  result: Result.Result<unknown, unknown>
): boolean => resultViewState(result)._tag === "Loading";

/** Safe, user-facing error message for failed Effect Atom resource states. */
export const resultErrorMessage = (
  result: Result.Result<unknown, unknown>
): string | undefined => {
  const state = resultViewState(result);
  return state._tag === "Failure" ? state.message : undefined;
};
