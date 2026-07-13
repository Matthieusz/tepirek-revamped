import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { hasDiscordGuild } from "./discord-guild.ts";
import { DiscordRequestFailureError } from "./discord-request-failure-error.ts";
import { DiscordVerificationConfig } from "./discord-verification-config.ts";
import { UserAdapterError } from "./user-adapter-error.ts";

export class DiscordGuildVerifier extends Context.Service<
  DiscordGuildVerifier,
  {
    readonly verifyMembership: (
      accessToken: string
    ) => Effect.Effect<boolean, UserAdapterError>;
  }
>()("@tepirek-revamped/api/user/DiscordGuildVerifier") {}

const DiscordGuilds = Schema.Array(
  Schema.Struct({
    id: Schema.String,
  })
);

const DISCORD_REQUEST_TIMEOUT = "10 seconds";
const DISCORD_RETRY_LIMIT = 2;
const DISCORD_RETRY_BASE_DELAY_MILLISECONDS = 100;
const MILLISECONDS_PER_SECOND = 1000;

const parseRetryAfterMilliseconds = (
  response: Response
): number | undefined => {
  const retryAfter = response.headers.get("Retry-After");
  if (retryAfter === null) {
    return undefined;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * MILLISECONDS_PER_SECOND;
  }

  const retryAt = Date.parse(retryAfter);
  return Number.isNaN(retryAt) ? undefined : Math.max(0, retryAt - Date.now());
};

const retryTransient = <A>(
  effect: Effect.Effect<A, DiscordRequestFailureError>,
  retriesRemaining = DISCORD_RETRY_LIMIT,
  attempt = 0
): Effect.Effect<A, DiscordRequestFailureError> =>
  effect.pipe(
    Effect.catchIf(
      (failure) => failure.retryable && retriesRemaining > 0,
      (failure) => {
        const fallbackDelay =
          DISCORD_RETRY_BASE_DELAY_MILLISECONDS * 2 ** attempt;
        const delay = failure.retryAfterMilliseconds ?? fallbackDelay;
        return Effect.sleep(delay).pipe(
          Effect.andThen(
            retryTransient(effect, retriesRemaining - 1, attempt + 1)
          )
        );
      }
    )
  );

const fetchDiscordGuilds = (
  accessToken: string
): Effect.Effect<readonly { readonly id: string }[] | null, UserAdapterError> =>
  Effect.tryPromise({
    catch: (cause) =>
      cause instanceof DiscordRequestFailureError
        ? cause
        : new DiscordRequestFailureError(
            "Discord transport failure",
            true,
            undefined,
            { cause }
          ),
    try: async (signal) => {
      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });

      if (response.status === 401 || response.status === 403) {
        return null;
      }

      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        throw new DiscordRequestFailureError(
          `Discord responded with status ${response.status}`,
          retryable,
          response.status === 429
            ? parseRetryAfterMilliseconds(response)
            : undefined
        );
      }

      return response.json();
    },
  }).pipe(
    retryTransient,
    Effect.flatMap((payload) =>
      payload === null
        ? Effect.succeed(null)
        : Schema.decodeUnknownEffect(DiscordGuilds)(payload)
    ),
    Effect.mapError(
      (cause) =>
        new UserAdapterError({
          cause,
          operation: "verifyDiscordGuildMembership",
        })
    ),
    Effect.timeoutOrElse({
      duration: DISCORD_REQUEST_TIMEOUT,
      orElse: () =>
        Effect.fail(
          new UserAdapterError({
            cause: new Error("Discord request timed out"),
            operation: "verifyDiscordGuildMembership",
          })
        ),
    })
  );

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
        function* verifyMembership(accessToken) {
          const guilds = yield* fetchDiscordGuilds(accessToken);
          return hasDiscordGuild(guilds, config.guildId);
        }
      ),
    });
  })
);
