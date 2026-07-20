import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Num from "effect/Number";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";
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
const RetryAfterSeconds = Schema.NumberFromString.pipe(
  Schema.check(Schema.isGreaterThanOrEqualTo(0))
);
const decodeRetryAfterSeconds = Schema.decodeUnknownOption(RetryAfterSeconds);
const decodeRetryAfterDate = Schema.decodeUnknownOption(Schema.DateFromString);

const parseRetryAfterMilliseconds = (
  response: Response
): Effect.Effect<number | undefined> =>
  Effect.gen(function* parseRetryAfter() {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter === null) {
      return;
    }

    const seconds = decodeRetryAfterSeconds(retryAfter);
    if (Option.isSome(seconds)) {
      return seconds.value * MILLISECONDS_PER_SECOND;
    }

    const retryAt = decodeRetryAfterDate(retryAfter);
    if (Option.isNone(retryAt)) {
      return;
    }

    const currentTime = yield* Clock.currentTimeMillis;
    return Num.max(0, retryAt.value.getTime() - currentTime);
  });

const discordRetrySchedule: Schedule.Schedule<
  DiscordRequestFailureError,
  DiscordRequestFailureError
> = Schedule.exponential(DISCORD_RETRY_BASE_DELAY_MILLISECONDS).pipe(
  Schedule.take(DISCORD_RETRY_LIMIT),
  Schedule.jittered,
  Schedule.setInputType<DiscordRequestFailureError>(),
  Schedule.passthrough,
  Schedule.modifyDelay((failure, backoffDelay) =>
    Effect.succeed(
      failure.retryAfterMilliseconds === undefined
        ? backoffDelay
        : Duration.max(
            backoffDelay,
            Duration.millis(failure.retryAfterMilliseconds)
          )
    )
  )
);

const retryTransient = <A>(
  effect: Effect.Effect<A, DiscordRequestFailureError>
): Effect.Effect<A, DiscordRequestFailureError> =>
  effect.pipe(
    Effect.retry({
      schedule: discordRetrySchedule,
      while: (failure) => failure.retryable,
    })
  );

const fetchDiscordGuilds = (
  accessToken: string
): Effect.Effect<readonly { readonly id: string }[] | null, UserAdapterError> =>
  Effect.tryPromise({
    catch: (cause) =>
      cause instanceof DiscordRequestFailureError
        ? cause
        : new DiscordRequestFailureError({
            cause,
            message: "Discord transport failure",
            retryable: true,
          }),
    try: (signal) =>
      fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      }),
  }).pipe(
    Effect.flatMap((response) =>
      Effect.gen(function* classifyDiscordResponse() {
        if (response.status === 401 || response.status === 403) {
          return null;
        }

        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          return yield* new DiscordRequestFailureError({
            message: `Discord responded with status ${response.status}`,
            retryAfterMilliseconds:
              response.status === 429
                ? yield* parseRetryAfterMilliseconds(response)
                : undefined,
            retryable,
          });
        }

        return yield* Effect.tryPromise({
          catch: (cause) =>
            new DiscordRequestFailureError({
              cause,
              message: "Discord response decoding failed",
              retryable: false,
            }),
          try: () => response.json(),
        });
      })
    ),
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
