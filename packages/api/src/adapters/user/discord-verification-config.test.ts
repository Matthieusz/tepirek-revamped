import { expect, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";

import { DiscordVerificationConfig } from "./discord-verification-config.ts";

it.effect("loads a trimmed Discord guild ID", () => {
  const program = DiscordVerificationConfig.pipe(
    Effect.provide(DiscordVerificationConfig.layer),
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown({ DISCORD_SERVER_ID: " guild-1 " })
    )
  );

  return Effect.gen(function* loadDiscordConfigEffect() {
    const config = yield* program;

    expect(config.guildId).toBe("guild-1");
  });
});

it.effect("fails layer construction for an empty Discord guild ID", () => {
  const program = DiscordVerificationConfig.pipe(
    Effect.provide(DiscordVerificationConfig.layer),
    Effect.provideService(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromUnknown({ DISCORD_SERVER_ID: "" })
    )
  );

  return Effect.gen(function* loadDiscordConfigFailureEffect() {
    const error = yield* Effect.flip(program);

    expect(error._tag).toBe("ConfigError");
  });
});
