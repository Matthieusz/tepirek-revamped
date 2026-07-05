import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";
import type { Redacted } from "effect/Redacted";
import * as Schema from "effect/Schema";

import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";

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
): Outcome<FirecrawlCreditCount, ParseFirecrawlConfigError> => {
  if (!Number.isSafeInteger(input) || input < 0) {
    return fail({
      _tag: "InvalidFirecrawlConfig",
      message: "Firecrawl credits used must be a non-negative integer",
    });
  }

  // SAFETY: non-negative integer establishes FirecrawlCreditCount.
  return success(input as FirecrawlCreditCount);
};

const MonthlyRequestBudget = Schema.Int.check(
  Schema.isBetween({
    maximum: 1000,
    minimum: 1,
  })
);

const firecrawlConfig = Config.all({
  apiKey: Config.redacted("FIRECRAWL_API_KEY"),
  monthlyRequestBudget: Config.schema(
    MonthlyRequestBudget,
    "FIRECRAWL_MONTHLY_REQUEST_BUDGET"
  ).pipe(Config.withDefault(900)),
});

/** Live Firecrawl config layer parsed at the runtime boundary. */
export const FirecrawlConfigServiceLiveLayer: Layer.Layer<
  FirecrawlConfigService,
  Config.ConfigError
> = Layer.effect(
  FirecrawlConfigService,
  EffectRuntime.gen(function* makeFirecrawlConfig() {
    return FirecrawlConfigService.of(yield* firecrawlConfig);
  })
);
