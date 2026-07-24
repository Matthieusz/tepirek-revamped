import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Redacted from "effect/Redacted";
import * as Schedule from "effect/Schedule";
import type * as Schema from "effect/Schema";
import * as HttpClient from "effect/unstable/http/HttpClient";
import type * as HttpClientError from "effect/unstable/http/HttpClientError";
import * as HttpClientRequest from "effect/unstable/http/HttpClientRequest";
import * as HttpClientResponse from "effect/unstable/http/HttpClientResponse";

import { DiscordGuilds, hasDiscordGuild } from "./discord-guild.ts";
import { DiscordVerificationConfig } from "./discord-verification-config.ts";
import { UserAdapterError } from "./user-adapter-error.ts";

/** Verifies whether a user's linked Discord account belongs to the configured guild. */
export class DiscordGuildVerifier extends Context.Service<
  DiscordGuildVerifier,
  {
    readonly verifyMembership: (
      accessToken: Redacted.Redacted<string>
    ) => Effect.Effect<boolean, UserAdapterError>;
  }
>()("@tepirek-revamped/api/user/DiscordGuildVerifier") {}

const DISCORD_API_BASE_URL = "https://discord.com/api";
const DISCORD_GUILDS_PATH = "/users/@me/guilds";
const DISCORD_REQUEST_TIMEOUT = "10 seconds";
const DISCORD_RETRY_LIMIT = 2;
const DISCORD_RETRY_BASE_DELAY_MILLISECONDS = 100;
const MILLISECONDS_PER_SECOND = 1000;

const parseRetryAfterMilliseconds = (
  error: HttpClientError.HttpClientError
): Effect.Effect<number | undefined> =>
  Effect.gen(function* parseRetryAfter() {
    if (
      error.reason._tag !== "StatusCodeError" ||
      error.reason.response.status !== 429
    ) {
      return;
    }

    const retryAfter = error.reason.response.headers["retry-after"];
    if (retryAfter === undefined) {
      return;
    }

    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) {
      return Number.isFinite(seconds) && seconds >= 0
        ? seconds * MILLISECONDS_PER_SECOND
        : undefined;
    }

    const retryAt = Date.parse(retryAfter);
    if (!Number.isFinite(retryAt)) {
      return;
    }

    const currentTime = yield* Clock.currentTimeMillis;
    const delay = retryAt - currentTime;
    return delay >= 0 ? delay : undefined;
  });

const discordRetrySchedule: Schedule.Schedule<
  HttpClientError.HttpClientError,
  HttpClientError.HttpClientError
> = Schedule.exponential(DISCORD_RETRY_BASE_DELAY_MILLISECONDS).pipe(
  Schedule.upTo({ times: DISCORD_RETRY_LIMIT }),
  Schedule.jittered,
  Schedule.setInputType<HttpClientError.HttpClientError>(),
  Schedule.passthrough,
  Schedule.modifyDelay(({ output: failure, duration: backoffDelay }) =>
    parseRetryAfterMilliseconds(failure).pipe(
      Effect.map((retryAfterMilliseconds) =>
        retryAfterMilliseconds === undefined
          ? backoffDelay
          : Duration.max(backoffDelay, Duration.millis(retryAfterMilliseconds))
      )
    )
  )
);

const isAcceptedDiscordStatus = (status: number): boolean =>
  (status >= 200 && status < 300) || status === 401 || status === 403;

const makeDiscordClient = (client: HttpClient.HttpClient) =>
  client.pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(DISCORD_API_BASE_URL)),
    HttpClient.filterStatus(isAcceptedDiscordStatus),
    // withRateLimiter retries 429 responses independently and could exceed this
    // verifier's fixed three-attempt bound, so the bounded client retry owns it.
    HttpClient.retryTransient({
      retryOn: "errors-only",
      schedule: discordRetrySchedule,
    })
  );

const fetchDiscordGuilds = (
  client: HttpClient.HttpClient,
  accessToken: Redacted.Redacted<string>
): Effect.Effect<
  DiscordGuilds | false,
  HttpClientError.HttpClientError | Schema.SchemaError
> => {
  const request = HttpClientRequest.get(DISCORD_GUILDS_PATH).pipe(
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(accessToken)
  );

  return Effect.gen(function* fetchGuilds() {
    const response = yield* client.execute(request);
    if (response.status === 401 || response.status === 403) {
      return false as const;
    }
    return yield* HttpClientResponse.schemaBodyJson(DiscordGuilds)(response);
  });
};

/** Live Discord verifier requiring explicit configuration and HTTP transport. */
export const DiscordGuildVerifierLiveLayer: Layer.Layer<
  DiscordGuildVerifier,
  never,
  DiscordVerificationConfig | HttpClient.HttpClient
> = Layer.effect(
  DiscordGuildVerifier,
  Effect.gen(function* DiscordGuildVerifierLiveLayer() {
    const config = yield* DiscordVerificationConfig;
    const client = makeDiscordClient(yield* HttpClient.HttpClient);

    return DiscordGuildVerifier.of({
      verifyMembership: Effect.fn("DiscordGuildVerifier.verifyMembership")(
        function* verifyMembership(accessToken) {
          const guilds = yield* fetchDiscordGuilds(client, accessToken).pipe(
            Effect.timeout(DISCORD_REQUEST_TIMEOUT),
            Effect.mapError(
              (cause) =>
                new UserAdapterError({
                  cause,
                  operation: "verifyDiscordGuildMembership",
                })
            )
          );

          return guilds === false
            ? false
            : hasDiscordGuild(guilds, config.guildId);
        }
      ),
    });
  })
);
