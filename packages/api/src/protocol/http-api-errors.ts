import * as Schema from "effect/Schema";

const taggedMessageError = (tag: RegExp) =>
  Schema.Struct({
    _tag: Schema.String.check(Schema.isPattern(tag)),
    message: Schema.String,
  });

const taggedOperationError = (tag: RegExp) =>
  Schema.Struct({
    _tag: Schema.String.check(Schema.isPattern(tag)),
    operation: Schema.String,
  });

/** HTTP API errors representing an expired or missing authenticated session. */
export const HttpApiUnauthorizedError = taggedMessageError(/Unauthorized$/u);

/** HTTP API errors representing an authenticated actor without permission. */
export const HttpApiForbiddenError = taggedMessageError(/Forbidden$/u);

/** HTTP API errors representing invalid client input. */
export const HttpApiBadRequestError = taggedMessageError(
  /(?:BadRequest|InvalidInput)$/u
);

/** HTTP API errors representing a write conflict. */
export const HttpApiConflictError = taggedMessageError(/Conflict$/u);

/** HTTP API errors representing a missing resource. */
export const HttpApiNotFoundError = taggedMessageError(/NotFound$/u);

/** HTTP API errors representing unavailable persistence. */
export const HttpApiPersistenceUnavailableError = taggedOperationError(
  /PersistenceUnavailable$/u
);

/** HTTP API errors representing an unavailable upstream service. */
export const HttpApiUpstreamUnavailableError =
  taggedMessageError(/UpstreamUnavailable$/u);

/** HTTP API errors representing an exhausted request budget. */
export const HttpApiRateLimitedError = taggedMessageError(/RateLimited$/u);

/** All semantic error categories exposed by the HTTP API protocol. */
export const HttpApiError = Schema.Union([
  HttpApiUnauthorizedError,
  HttpApiForbiddenError,
  HttpApiBadRequestError,
  HttpApiConflictError,
  HttpApiNotFoundError,
  HttpApiPersistenceUnavailableError,
  HttpApiRateLimitedError,
  HttpApiUpstreamUnavailableError,
]);

/** Type-level representation of the semantic HTTP API error categories. */
export type HttpApiError = typeof HttpApiError.Type;
