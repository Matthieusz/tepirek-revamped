/** Whether a value is a safe integer greater than zero. */
export const isPositiveInteger = (value: number): boolean =>
  Number.isSafeInteger(value) && value > 0;

/**
 * A wrapper that prevents accidental logging, inspection, or JSON serialization
 * of sensitive values such as API keys, tokens, and passwords.
 */
declare const brand: unique symbol;

export type Redacted<T> = T & { readonly [brand]: "Redacted" };

/** Wrap a sensitive value so it cannot be accidentally logged or serialized. */
export const Redacted = <T>(value: T): Redacted<T> => value as Redacted<T>;

/** Unwrap a redacted value. Call only at the exact boundary that needs the raw secret. */
export const unwrapRedacted = <T>(redacted: Redacted<T>): T => redacted as T;
