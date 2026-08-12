import * as Config from "effect/Config";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import type * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

/** Validated runtime values required to configure Better Auth. */
export interface AuthEnv {
  readonly betterAuthSecret: Redacted.Redacted;
  readonly betterAuthUrl: URL;
  readonly corsOrigin: URL;
  readonly discordClientId: string;
  readonly discordClientSecret: Redacted.Redacted;
  readonly isProduction: boolean;
}

const NonEmptyString = Schema.String.check(Schema.isNonEmpty());
const BetterAuthSecret = Schema.String.check(Schema.isMinLength(32));
const TrimmedNonEmptyString = Schema.Trim.pipe(
  Schema.check(Schema.isNonEmpty())
);

const authEnvConfig = Config.all({
  betterAuthSecret: Config.schema(
    Schema.Redacted(BetterAuthSecret),
    "BETTER_AUTH_SECRET"
  ),
  betterAuthUrl: Config.url("BETTER_AUTH_URL"),
  corsOrigin: Config.url("CORS_ORIGIN"),
  discordClientId: Config.schema(TrimmedNonEmptyString, "DISCORD_CLIENT_ID"),
  discordClientSecret: Config.schema(
    Schema.Redacted(NonEmptyString),
    "DISCORD_CLIENT_SECRET"
  ),
  isProduction: Config.string("NODE_ENV").pipe(
    Config.withDefault("development"),
    Config.map((nodeEnv) => nodeEnv === "production")
  ),
});

/** Effect config service for Better Auth's runtime configuration. */
export class AuthConfig extends Context.Service<AuthConfig, AuthEnv>()(
  "@tepirek-revamped/auth/AuthConfig"
) {}

/** Live Better Auth config layer backed by Effect's environment provider. */
export const AuthConfigLiveLayer = Layer.effect(AuthConfig, authEnvConfig);
