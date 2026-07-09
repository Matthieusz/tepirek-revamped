import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** A Firecrawl budget month formatted as YYYY-MM. */
export type FirecrawlYearMonth = string & {
  readonly __brand: "FirecrawlYearMonth";
};

/** Expected failure when a Firecrawl budget month is invalid. */
export class InvalidFirecrawlYearMonth extends Schema.TaggedErrorClass<InvalidFirecrawlYearMonth>()(
  "InvalidFirecrawlYearMonth",
  {}
) {}

const yearMonthPattern = /^\d{4}-\d{2}$/u;

/** Parse a YYYY-MM Firecrawl budget month. */
export const parseFirecrawlYearMonth = (
  input: string
): Effect.Effect<FirecrawlYearMonth, InvalidFirecrawlYearMonth> => {
  if (!yearMonthPattern.test(input)) {
    return Effect.fail(new InvalidFirecrawlYearMonth());
  }

  // SAFETY: yearMonthPattern established the FirecrawlYearMonth invariant.
  return Effect.succeed(input as FirecrawlYearMonth);
};

/** Get the UTC Firecrawl budget month for a date. */
export const firecrawlYearMonthFromDate = (date: Date): FirecrawlYearMonth => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  // SAFETY: year/month from Date always produce valid YYYY-MM.
  return `${year}-${month}` as FirecrawlYearMonth;
};

/** Convert a Firecrawl budget month to its primitive representation. */
export const firecrawlYearMonthToString = (
  yearMonth: FirecrawlYearMonth
): string => yearMonth;
