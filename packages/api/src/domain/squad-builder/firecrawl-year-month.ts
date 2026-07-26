import * as Schema from "effect/Schema";

const yearMonthPattern = /^\d{4}-\d{2}$/u;

/** A Firecrawl budget month formatted as YYYY-MM. */
export const FirecrawlYearMonth = Schema.String.pipe(
  Schema.check(Schema.isPattern(yearMonthPattern)),
  Schema.brand("FirecrawlYearMonth")
);
export type FirecrawlYearMonth = typeof FirecrawlYearMonth.Type;

/** Get the UTC Firecrawl budget month for a date. */
export const firecrawlYearMonthFromDate = (date: Date): FirecrawlYearMonth => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return FirecrawlYearMonth.make(`${year}-${month}`);
};
