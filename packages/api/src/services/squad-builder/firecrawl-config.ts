/* eslint-disable max-classes-per-file -- Collocated config service and error schema. */
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import type { Redacted } from "effect/Redacted";
import * as Schema from "effect/Schema";

/** Expected failure when Firecrawl config is missing or unsafe. */
export class ParseFirecrawlConfigError extends Schema.TaggedErrorClass<ParseFirecrawlConfigError>()(
  "InvalidFirecrawlConfig",
  { message: Schema.String }
) {}

/** Number of Firecrawl credits consumed by a scrape. */
export const FirecrawlCreditCount = Schema.Finite.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 0 })
).pipe(Schema.brand("FirecrawlCreditCount"));
export type FirecrawlCreditCount = typeof FirecrawlCreditCount.Type;

/** Runtime config for Firecrawl-backed scraping. */
export interface FirecrawlConfig {
  readonly apiKey: Redacted;
  readonly monthlyRequestBudget: number;
}

/** Service tag for Firecrawl-backed scraping configuration. */
export class FirecrawlConfigService extends Context.Service<
  FirecrawlConfigService,
  FirecrawlConfig
>()("@tepirek-revamped/api/squad-builder/FirecrawlConfigService") {}

/** Parse a number into a Firecrawl credit count. */
export const parseFirecrawlCreditCount = EffectRuntime.fn(
  "FirecrawlConfig.parseCreditCount"
)(
  (
    input: number
  ): EffectRuntime.Effect<FirecrawlCreditCount, ParseFirecrawlConfigError> =>
    Schema.decodeEffect(FirecrawlCreditCount)(input).pipe(
      EffectRuntime.mapError(
        () =>
          new ParseFirecrawlConfigError({
            message: "Firecrawl credits used must be a non-negative integer",
          })
      )
    )
);
