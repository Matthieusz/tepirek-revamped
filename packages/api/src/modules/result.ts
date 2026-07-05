/** Typed result used by legacy squad-builder pure parsing seams. */
export type Result<TValue, TError> =
  | { readonly _tag: "Ok"; readonly value: TValue }
  | { readonly _tag: "Error"; readonly error: TError };

/** Create a successful result. */
export const ok = <TValue>(value: TValue): Result<TValue, never> => ({
  _tag: "Ok",
  value,
});

/** Create a failed result. */
export const err = <TError>(error: TError): Result<never, TError> => ({
  _tag: "Error",
  error,
});

/** Narrow a result to success. */
export const isOk = <TValue, TError>(
  result: Result<TValue, TError>
): result is { readonly _tag: "Ok"; readonly value: TValue } =>
  result._tag === "Ok";

/** Narrow a result to expected failure. */
export const isError = <TValue, TError>(
  result: Result<TValue, TError>
): result is { readonly _tag: "Error"; readonly error: TError } =>
  result._tag === "Error";
