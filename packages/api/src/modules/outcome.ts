/** Typed outcome used by legacy squad-builder pure parsing seams. */
export type Outcome<TValue, TError> =
  | { readonly _tag: "Ok"; readonly value: TValue }
  | { readonly _tag: "Error"; readonly error: TError };

/** Create a successful outcome. */
export const success = <TValue>(value: TValue): Outcome<TValue, never> => ({
  _tag: "Ok",
  value,
});

/** Create a failed outcome. */
export const fail = <TError>(error: TError): Outcome<never, TError> => ({
  _tag: "Error",
  error,
});

/** Narrow an outcome to success. */
export const isSuccess = <TValue, TError>(
  outcome: Outcome<TValue, TError>
): outcome is { readonly _tag: "Ok"; readonly value: TValue } =>
  outcome._tag === "Ok";

/** Narrow an outcome to expected failure. */
export const isFailure = <TValue, TError>(
  outcome: Outcome<TValue, TError>
): outcome is { readonly _tag: "Error"; readonly error: TError } =>
  outcome._tag === "Error";
