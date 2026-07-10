import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/** A Firecrawl budget month formatted as YYYY-MM. */
export const FirecrawlYearMonth = Schema.String.pipe(
  Schema.brand("FirecrawlYearMonth")
);
export type FirecrawlYearMonth = typeof FirecrawlYearMonth.Type;

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

  return Effect.succeed(FirecrawlYearMonth.make(input));
};

/** Get the UTC Firecrawl budget month for a date. */
export const firecrawlYearMonthFromDate = (date: Date): FirecrawlYearMonth => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return FirecrawlYearMonth.make(`${year}-${month}`);
};

/** Convert a Firecrawl budget month to its primitive representation. */
export const firecrawlYearMonthToString = (
  yearMonth: FirecrawlYearMonth
): string => yearMonth;
