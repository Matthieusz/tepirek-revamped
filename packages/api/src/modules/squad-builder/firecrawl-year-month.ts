import { fail, isFailure, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";

/** A Firecrawl budget month formatted as YYYY-MM. */
export type FirecrawlYearMonth = string & {
  readonly __brand: "FirecrawlYearMonth";
};

/** Expected failure when a Firecrawl budget month is invalid. */
export interface InvalidFirecrawlYearMonth {
  readonly _tag: "InvalidFirecrawlYearMonth";
}

const yearMonthPattern = /^\d{4}-\d{2}$/u;

/** Parse a YYYY-MM Firecrawl budget month. */
export const parseFirecrawlYearMonth = (
  input: string
): Outcome<FirecrawlYearMonth, InvalidFirecrawlYearMonth> => {
  if (!yearMonthPattern.test(input)) {
    return fail({ _tag: "InvalidFirecrawlYearMonth" });
  }

  // SAFETY: yearMonthPattern established the FirecrawlYearMonth invariant.
  return success(input as FirecrawlYearMonth);
};

/** Get the UTC Firecrawl budget month for a date. */
export const firecrawlYearMonthFromDate = (date: Date): FirecrawlYearMonth => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const parsed = parseFirecrawlYearMonth(`${year}-${month}`);

  if (isFailure(parsed)) {
    throw new Error("Failed to construct Firecrawl year-month");
  }

  return parsed.value;
};

/** Convert a Firecrawl budget month to its primitive representation. */
export const firecrawlYearMonthToString = (
  yearMonth: FirecrawlYearMonth
): string => yearMonth;
