import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export class DiscordVerificationConfig extends Context.Service<
  DiscordVerificationConfig,
  { readonly guildId: string }
>()("@tepirek-revamped/api/user/DiscordVerificationConfig") {
  static readonly layer: Layer.Layer<
    DiscordVerificationConfig,
    Config.ConfigError
  > = Layer.effect(
    DiscordVerificationConfig,
    Config.string("DISCORD_SERVER_ID").pipe(
      Effect.map((guildId) => DiscordVerificationConfig.of({ guildId }))
    )
  );
}
