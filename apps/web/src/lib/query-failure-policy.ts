import {
  HttpApiError,
  HttpApiPersistenceUnavailableError,
  HttpApiRateLimitedError,
  HttpApiUpstreamUnavailableError,
} from "@tepirek-revamped/api/protocol/http-api-errors";
import type { HttpApiError as HttpApiFailure } from "@tepirek-revamped/api/protocol/http-api-errors";
import { Match, Schema } from "effect";
import { EffectQueryFailure } from "effect-query";
import { isHttpClientError } from "effect/http/HttpClientError";

import type { CaughtError } from "./errors";

interface ResponseGuidance {
  readonly retryAfter?: string | undefined;
  readonly correlationId?: string | undefined;
}

const responseGuidance = new WeakMap<HttpApiFailure, ResponseGuidance>();

const correlationIdPattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu;

const deltaSecondsPattern = /^\d+$/u;

const isServiceUnavailable = Schema.is(
  Schema.Union([
    HttpApiPersistenceUnavailableError,
    HttpApiUpstreamUnavailableError,
  ])
);

const isRateLimited = Schema.is(HttpApiRateLimitedError);

const maximumRetryDelay = 2_147_483_647;

const retryAfterDelay = (
  guidance: ResponseGuidance | undefined
): number | undefined => {
  const retryAfter = guidance?.retryAfter?.trim();

  if (retryAfter === undefined || retryAfter.length === 0) {
    return undefined;
  }

  const delay = deltaSecondsPattern.test(retryAfter)
    ? Number(retryAfter) * 1000
    : Date.parse(retryAfter) - Date.now();

  return Number.isFinite(delay) && delay >= 0 && delay <= maximumRetryDelay
    ? delay
    : undefined;
};

/** Retains only retry guidance and UUID request IDs, never response bodies or URLs. */
export const rememberFailureResponse = (
  failure: HttpApiFailure,
  headers: Readonly<Record<string, string>>
): void => {
  const requestId = headers["x-request-id"];
  const retryAfter = headers["retry-after"]?.trim();
  responseGuidance.set(failure, {
    correlationId:
      requestId !== undefined && correlationIdPattern.test(requestId)
        ? requestId
        : undefined,
    retryAfter: retryAfter === "" ? undefined : retryAfter,
  });
};

const failureValue = (error: CaughtError): CaughtError =>
  error instanceof EffectQueryFailure ? error.failure : error;

const guidanceFor = (failure: CaughtError): ResponseGuidance | undefined => {
  if (isHttpClientError(failure)) {
    const headers = failure.response?.headers;

    if (headers !== undefined) {
      const requestId = headers["x-request-id"];

      return {
        correlationId:
          requestId !== undefined && correlationIdPattern.test(requestId)
            ? requestId
            : undefined,
        retryAfter: headers["retry-after"],
      };
    }
  }

  return Schema.is(HttpApiError)(failure)
    ? responseGuidance.get(failure)
    : undefined;
};

/** Allows one TanStack-owned retry only for positively identified transient read failures. */
export const shouldRetryQuery = (
  failureCount: number,
  error: CaughtError
): boolean => {
  if (failureCount >= 1) {
    return false;
  }

  const failure = failureValue(error);
  const guidance = guidanceFor(failure);

  // Do not retry earlier than unschedulable or invalid server guidance.
  if (
    guidance?.retryAfter !== undefined &&
    retryAfterDelay(guidance) === undefined
  ) {
    return false;
  }

  if (isServiceUnavailable(failure)) {
    return true;
  }

  // Protocol rate limits can represent monthly budgets, not transient throttling.
  if (isRateLimited(failure)) {
    return retryAfterDelay(guidance) !== undefined;
  }

  if (!isHttpClientError(failure)) {
    return false;
  }

  return Match.value(failure.reason).pipe(
    Match.tag("TransportError", () => true),
    Match.tag(
      "StatusCodeError",
      "DecodeError",
      ({ response: { status } }) =>
        status === 408 ||
        status === 429 ||
        status === 502 ||
        status === 503 ||
        status === 504
    ),
    Match.orElse(() => false)
  );
};

/** Uses Retry-After seconds or HTTP dates when present; otherwise uses bounded backoff. */
export const queryRetryDelay = (attempt: number, error: CaughtError): number =>
  retryAfterDelay(guidanceFor(failureValue(error))) ??
  Math.min(1000 * 2 ** attempt, 30_000);

/** Returns a validated server request ID, if the transport supplied one. */
export const failureCorrelationId = (error: CaughtError): string | undefined =>
  guidanceFor(failureValue(error))?.correlationId;
