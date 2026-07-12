import * as Config from "effect/Config";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { FirecrawlConfigService } from "../../../services/squad-builder/firecrawl-config.ts";
import type { FirecrawlConfig } from "../../../services/squad-builder/firecrawl-config.ts";

const MonthlyRequestBudget = Schema.Int.check(
  Schema.isBetween({
    maximum: 1000,
    minimum: 1,
  })
);

/** Firecrawl configuration parsed from the active Effect Config provider. */
export const readFirecrawlConfig = Config.all({
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
    return FirecrawlConfigService.of(yield* readFirecrawlConfig);
  })
);

/** Provide an already-parsed Firecrawl configuration. */
export const makeFirecrawlConfigLayer = (config: FirecrawlConfig) =>
  Layer.succeed(FirecrawlConfigService, config);
