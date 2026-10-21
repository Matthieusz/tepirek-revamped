import {
  HttpApiUnauthorizedError,
  HttpApiForbiddenError,
  HttpApiBadRequestError,
  HttpApiConflictError,
  HttpApiNotFoundError,
  HttpApiPersistenceUnavailableError,
  HttpApiRateLimitedError,
  HttpApiUpstreamUnavailableError,
} from "@tepirek-revamped/api/protocol/http-api-errors";
import { Option, Schema } from "effect";
import { EffectQueryDefect, EffectQueryFailure } from "effect-query";
import { isHttpClientError } from "effect/http/HttpClientError";

import type { CaughtError } from "./errors";
import { failureCorrelationId } from "./query-failure-policy";

const categories = [
  [Schema.is(HttpApiUnauthorizedError), "Unauthorized"],
  [Schema.is(HttpApiForbiddenError), "Forbidden"],
  [Schema.is(HttpApiBadRequestError), "InvalidInput"],
  [Schema.is(HttpApiConflictError), "Conflict"],
  [Schema.is(HttpApiNotFoundError), "NotFound"],
  [Schema.is(HttpApiPersistenceUnavailableError), "PersistenceUnavailable"],
  [Schema.is(HttpApiRateLimitedError), "RateLimited"],
  [Schema.is(HttpApiUpstreamUnavailableError), "UpstreamUnavailable"],
] as const;

const Operation = Schema.Literals([
  "squad-group-detail",
  "squad-group-characters",
  "save-squad-group",
  "save-shared-squad-characters",
  "set-squad-group-visibility",
]);

/** Safe cache failure record. No keys, variables, messages, bodies, or causes are included. */
export interface QueryDiagnostic {
  readonly operation: typeof Operation.Type | "query" | "mutation";
  readonly errorTag:
    | (typeof categories)[number][1]
    | "EffectQueryDefect"
    | "HttpClientError"
    | "UnknownFailure";
  readonly correlationId?: string | undefined;
}

/** Projects unknown cache failures to a closed set of operation and semantic error labels. */
export const queryDiagnostic = (
  kind: "query" | "mutation",
  operation: CaughtError,
  error: CaughtError
): QueryDiagnostic => {
  const failure: unknown =
    error instanceof EffectQueryFailure ? error.failure : error;

  const errorTag =
    error instanceof EffectQueryDefect
      ? "EffectQueryDefect"
      : (categories.find(([isCategory]) => isCategory(failure))?.[1] ??
        (isHttpClientError(failure) ? "HttpClientError" : "UnknownFailure"));

  return {
    correlationId: failureCorrelationId(error),
    errorTag,
    operation: Option.getOrElse(
      Schema.decodeUnknownOption(Operation)(operation),
      () => kind
    ),
  };
};

/** Reports only the safe cache projection to the browser diagnostic sink. */
export const reportQueryDiagnostic = (diagnostic: QueryDiagnostic): void => {
  console.warn("API operation failed", diagnostic);
};
