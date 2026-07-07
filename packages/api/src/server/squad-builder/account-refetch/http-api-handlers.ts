/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.js";
import {
  layer as applyAccountRefetchLayer,
  use as applyAccountRefetch,
} from "../../../modules/squad-builder/account-refetch/apply-account-refetch-service.js";
import {
  layer as previewAccountRefetchLayer,
  use as previewAccountRefetch,
} from "../../../modules/squad-builder/account-refetch/preview-account-refetch-service.js";
import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderAccountRefetchError } from "../../../protocol/squad-builder/account-refetch/http-api-contract.js";
import {
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/account-refetch/http-api-contract.js";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountRefetchError>;

const toAppUserId = (value: string): AppUserId =>
  // SAFETY: HttpApi decoded this value with AppUserIdSchema before the handler runs.
  value as AppUserId;

const toMargonemAccountId = (value: number): MargonemAccountId =>
  // SAFETY: HttpApi decoded this value with MargonemAccountIdSchema before the handler runs.
  value as MargonemAccountId;

const toPendingRefetchId = (value: number): PendingMargonemAccountRefetchId =>
  // SAFETY: HttpApi decoded this value with PendingMargonemAccountRefetchIdSchema before the handler runs.
  value as PendingMargonemAccountRefetchId;

const withRequestCorrelation = <A, E, R>(
  request: HttpServerRequest,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  const requestId = request.headers["x-request-id"];

  if (requestId === undefined || requestId.length === 0) {
    return effect;
  }

  return effect.pipe(
    Effect.tap(() => Effect.annotateCurrentSpan("request.id", requestId))
  );
};

const invalidInputTags = new Set([
  "MargonemProfileNameNotFound",
  "MargonemCharacterRowsNotFound",
  "MargonemCharacterRowInvalid",
]);

const notFoundTags = new Set([
  "MargonemAccountNotFound",
  "PendingMargonemAccountRefetchNotFound",
]);

const upstreamTags = new Set([
  "FirecrawlMonthlyBudgetExhausted",
  "FirecrawlRequestFailed",
  "FirecrawlResponseNotParseable",
  "RequestCancelled",
]);

const toSquadBuilderFail = (
  error: unknown
): Effect.Effect<never, ProtocolError, never> => {
  if (typeof error !== "object" || error === null || !("_tag" in error)) {
    return Effect.fail(
      new SquadBuilderUpstreamUnavailable({ message: "Unknown error" })
    );
  }

  const tagged = error as { _tag: string; cause?: unknown; operation?: string };

  if (tagged._tag === "SquadBuilderPersistenceUnavailable") {
    return Effect.fail(
      new SquadBuilderPersistenceUnavailable({
        cause: tagged.cause,
        operation: tagged.operation ?? "unknown",
      })
    );
  }

  if (tagged._tag === "ActorDoesNotOwnMargonemAccount") {
    return Effect.fail(
      new SquadBuilderForbidden({ message: "Actor does not own the account" })
    );
  }

  if (invalidInputTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderInvalidInput({ message: tagged._tag }));
  }

  if (notFoundTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderNotFound({ message: tagged._tag }));
  }

  if (upstreamTags.has(tagged._tag)) {
    return Effect.fail(
      new SquadBuilderUpstreamUnavailable({ message: tagged._tag })
    );
  }

  return Effect.fail(
    new SquadBuilderUpstreamUnavailable({
      message: `Unknown error: ${tagged._tag}`,
    })
  );
};

// oxlint-disable-next-line promise/valid-params, promise/prefer-await-to-then, promise/prefer-await-to-callbacks
const withErrorMapping = <A, R>(
  self: Effect.Effect<A, unknown, R>
): Effect.Effect<A, ProtocolError, R> =>
  Effect.catch(
    self as Effect.Effect<A, unknown, never>,
    (error) => toSquadBuilderFail(error)
    // SAFETY: The protocol error type matches what HttpApi expects because the
    // error union includes all error classes handled in toSquadBuilderFail.
  ) as unknown as Effect.Effect<A, ProtocolError, R>;
// oxlint-enable promise/valid-params, promise/prefer-await-to-then, promise/prefer-await-to-callbacks

export const SquadBuilderAccountRefetchHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountRefetch",
  (handlers) =>
    handlers
      .handle("previewAccountRefetch", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            previewAccountRefetch.preview({
              accountId: toMargonemAccountId(payload.accountId),
              actorUserId: toAppUserId(payload.actorUserId),
            })
          )
        )
      )
      .handle("applyAccountRefetch", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            applyAccountRefetch.apply({
              actorUserId: toAppUserId(payload.actorUserId),
              refetchPreviewId: toPendingRefetchId(payload.refetchPreviewId),
            })
          )
        )
      )
).pipe(
  Layer.provide(
    Layer.mergeAll(previewAccountRefetchLayer, applyAccountRefetchLayer)
  )
);
