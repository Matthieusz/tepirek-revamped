import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { hasDiscordGuild } from "./discord-guild.js";
import { DiscordVerificationConfig } from "./discord-verification-config.js";
import { UserAdapterError } from "./user-adapter-error.js";

export class DiscordGuildVerifier extends Context.Service<
  DiscordGuildVerifier,
  {
    readonly verifyMembership: (
      accessToken: string
    ) => Effect.Effect<boolean, UserAdapterError>;
  }
>()("@tepirek-revamped/api/user/DiscordGuildVerifier") {}

const fetchDiscordGuilds = (
  accessToken: string
): Effect.Effect<unknown, UserAdapterError> =>
  Effect.tryPromise({
    catch: (cause) =>
      new UserAdapterError({
        cause,
        operation: "verifyDiscordGuildMembership",
      }),
    try: async () => {
      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        return null;
      }

      return response.json() as Promise<unknown>;
    },
  });

export const DiscordGuildVerifierLiveLayer: Layer.Layer<
  DiscordGuildVerifier,
  never,
  DiscordVerificationConfig
> = Layer.effect(
  DiscordGuildVerifier,
  Effect.gen(function* DiscordGuildVerifierLiveLayer() {
    const config = yield* DiscordVerificationConfig;

    return DiscordGuildVerifier.of({
      verifyMembership: Effect.fn("DiscordGuildVerifier.verifyMembership")(
        (accessToken) =>
          Effect.gen(function* verifyMembershipEffect() {
            const guilds = yield* fetchDiscordGuilds(accessToken);
            return hasDiscordGuild(guilds, config.guildId);
          })
      ),
    });
  })
);
