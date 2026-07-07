import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import type { Redacted } from "effect/Redacted";

/** Number of Firecrawl credits consumed by a scrape. */
export type FirecrawlCreditCount = number & {
  readonly __brand: "FirecrawlCreditCount";
};

/** Runtime config for Firecrawl-backed scraping. */
export interface FirecrawlConfig {
  readonly apiKey: Redacted<string>;
  readonly monthlyRequestBudget: number;
}

/** Service tag for Firecrawl-backed scraping configuration. */
export class FirecrawlConfigService extends Context.Service<
  FirecrawlConfigService,
  FirecrawlConfig
>()("@tepirek-revamped/api/squad-builder/FirecrawlConfigService") {}

/** Expected failure when Firecrawl config is missing or unsafe. */
export interface ParseFirecrawlConfigError {
  readonly _tag: "InvalidFirecrawlConfig";
  readonly message: string;
}

/** Parse a number into a Firecrawl credit count. */
export const parseFirecrawlCreditCount = (
  input: number
): EffectRuntime.Effect<FirecrawlCreditCount, ParseFirecrawlConfigError> => {
  if (!Number.isSafeInteger(input) || input < 0) {
    return EffectRuntime.fail({
      _tag: "InvalidFirecrawlConfig",
      message: "Firecrawl credits used must be a non-negative integer",
    });
  }

  // SAFETY: non-negative integer establishes FirecrawlCreditCount.
  return EffectRuntime.succeed(input as FirecrawlCreditCount);
};
