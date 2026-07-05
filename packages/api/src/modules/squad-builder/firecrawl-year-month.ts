import * as Effect from "effect/Effect";

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
): Effect.Effect<FirecrawlYearMonth, InvalidFirecrawlYearMonth> => {
  if (!yearMonthPattern.test(input)) {
    return Effect.fail({ _tag: "InvalidFirecrawlYearMonth" });
  }

  // SAFETY: yearMonthPattern established the FirecrawlYearMonth invariant.
  return Effect.succeed(input as FirecrawlYearMonth);
};

/** Get the UTC Firecrawl budget month for a date. */
export const firecrawlYearMonthFromDate = (date: Date): FirecrawlYearMonth => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return Effect.runSync(parseFirecrawlYearMonth(`${year}-${month}`));
};

/** Convert a Firecrawl budget month to its primitive representation. */
export const firecrawlYearMonthToString = (
  yearMonth: FirecrawlYearMonth
): string => yearMonth;
