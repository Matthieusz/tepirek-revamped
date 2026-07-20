import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

const yearMonthPattern = /^\d{4}-\d{2}$/u;

/** A Firecrawl budget month formatted as YYYY-MM. */
export const FirecrawlYearMonth = Schema.String.pipe(
  Schema.check(Schema.isPattern(yearMonthPattern)),
  Schema.brand("FirecrawlYearMonth")
);
export type FirecrawlYearMonth = typeof FirecrawlYearMonth.Type;

/** Expected failure when a Firecrawl budget month is invalid. */
export class InvalidFirecrawlYearMonth extends Schema.TaggedErrorClass<InvalidFirecrawlYearMonth>()(
  "InvalidFirecrawlYearMonth",
  {}
) {}

/** Parse a YYYY-MM Firecrawl budget month. */
export const parseFirecrawlYearMonth = Effect.fn("FirecrawlYearMonth.parse")(
  (
    input: string
  ): Effect.Effect<FirecrawlYearMonth, InvalidFirecrawlYearMonth> =>
    Schema.decodeUnknownEffect(FirecrawlYearMonth)(input).pipe(
      Effect.catchTag("SchemaError", () => new InvalidFirecrawlYearMonth())
    )
);

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
