import { expect, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import {
  EffectFirecrawlConfig,
  EffectFirecrawlConfigLiveLayer,
} from "./firecrawl-config.js";

it.effect("loads Firecrawl config from Effect Config with default budget", () =>
  Effect.gen(function* firecrawlConfigEffect() {
    const config = yield* EffectFirecrawlConfig;

    expect(Redacted.value(config.apiKey)).toBe("test-key");
    expect(config.monthlyRequestBudget).toBe(900);
  }).pipe(
    Effect.provide(EffectFirecrawlConfigLiveLayer),
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown({ FIRECRAWL_API_KEY: "test-key" })
    )
  )
);

it.effect("fails layer construction for invalid Firecrawl budget", () => {
  const program = EffectFirecrawlConfig.pipe(
    Effect.provide(EffectFirecrawlConfigLiveLayer),
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown({
        FIRECRAWL_API_KEY: "test-key",
        FIRECRAWL_MONTHLY_REQUEST_BUDGET: "1001",
      })
    )
  );

  return Effect.gen(function* firecrawlConfigFailureEffect() {
    const error = yield* Effect.flip(program);

    expect(error._tag).toBe("ConfigError");
  });
});
