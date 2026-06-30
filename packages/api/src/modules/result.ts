import { Result as BetterResult } from "better-result";
import type { Result as BetterResultType } from "better-result";

/** Typed result. */
export type Result<TValue, TError> = BetterResultType<TValue, TError>;

/** Create a successful result. */
export const { ok } = BetterResult;

/** Create a failed result. */
export const { err } = BetterResult;

/** Narrow a result to success. */
export const { isOk } = BetterResult;

/** Narrow a result to expected failure. */
export const { isError } = BetterResult;
