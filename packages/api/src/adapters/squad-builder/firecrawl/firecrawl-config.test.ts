import { expect, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";

import { readFirecrawlConfig } from "./firecrawl-config.ts";

it.effect("loads Firecrawl config from Effect Config with default budget", () =>
  Effect.gen(function* firecrawlConfigEffect() {
    const config = yield* readFirecrawlConfig;

    expect(Redacted.value(config.apiKey)).toBe("test-key");
    expect(config.monthlyRequestBudget).toBe(900);
    expect(config.perUserMonthlyRequestBudget).toBe(100);
  }).pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown({ FIRECRAWL_API_KEY: "test-key" })
    )
  )
);

it.effect("fails for an empty Firecrawl API key", () => {
  const program = readFirecrawlConfig.pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown({ FIRECRAWL_API_KEY: "" })
    )
  );

  return Effect.gen(function* firecrawlConfigFailureEffect() {
    const error = yield* Effect.flip(program);

    expect(error._tag).toBe("ConfigError");
  });
});

it.effect("fails for an invalid global Firecrawl budget", () => {
  const program = readFirecrawlConfig.pipe(
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

it.effect("parses an explicit per-user Firecrawl budget", () =>
  Effect.gen(function* firecrawlConfigEffect() {
    const config = yield* readFirecrawlConfig;

    expect(config.perUserMonthlyRequestBudget).toBe(250);
  }).pipe(
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown({
        FIRECRAWL_API_KEY: "test-key",
        FIRECRAWL_PER_USER_MONTHLY_REQUEST_BUDGET: "250",
      })
    )
  )
);

it.effect.each(["0", "-1", "1.5", "1001"] as const)(
  "fails for invalid per-user Firecrawl budget %s",
  (value) => {
    const program = readFirecrawlConfig.pipe(
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromUnknown({
          FIRECRAWL_API_KEY: "test-key",
          FIRECRAWL_PER_USER_MONTHLY_REQUEST_BUDGET: value,
        })
      )
    );

    return Effect.gen(function* firecrawlConfigFailureEffect() {
      const error = yield* Effect.flip(program);

      expect(error._tag).toBe("ConfigError");
      expect(String(error)).not.toContain("test-key");
    });
  }
);
