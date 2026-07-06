/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AccountImportStoreService } from "../../../modules/squad-builder/account-import/account-import-store-service.js";
import {
  layer as confirmOwnedAccountImportLayer,
  use as confirmOwnedAccountImport,
} from "../../../modules/squad-builder/account-import/confirm-owned-account-import-service.js";
import {
  layer as previewMargonemProfileImportLayer,
  use as previewMargonemProfileImport,
} from "../../../modules/squad-builder/account-import/preview-margonem-profile-import-service.js";
import {
  layer as previewOwnedAccountImportsLayer,
  use as previewOwnedAccountImports,
} from "../../../modules/squad-builder/account-import/preview-owned-account-imports-service.js";
import type { AppUserId } from "../../../modules/squad-builder/app-user-id.js";
import type { PendingMargonemAccountImportId } from "../../../modules/squad-builder/pending-margonem-account-import-id.js";
import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderAccountImportError } from "../../../protocol/squad-builder/account-import/http-api-contract.js";
import {
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/account-import/http-api-contract.js";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountImportError>;

const toAppUserId = (value: string): AppUserId =>
  // SAFETY: HttpApi decoded this value with AppUserIdSchema before the handler runs.
  value as AppUserId;

const toPendingImportId = (value: number): PendingMargonemAccountImportId =>
  // SAFETY: HttpApi decoded this value with PendingMargonemAccountImportIdSchema before the handler runs.
  value as PendingMargonemAccountImportId;

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
  "InvalidMargonemProfileUrl",
  "MissingMargonemProfileId",
  "MargonemProfileNameNotFound",
  "MargonemCharacterRowsNotFound",
  "MargonemCharacterRowInvalid",
  "InvalidAccountDisplayName",
  "EmptyProfileUrlBatch",
  "TooManyProfileUrlsInBatch",
]);

const conflictTags = new Set([
  "MargonemAccountAlreadyOwnedByActor",
  "MargonemAccountAlreadySharedWithActor",
  "MargonemAccountOwnedByAnotherUser",
  "DuplicateProfileInBatch",
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

  if (tagged._tag === "PendingMargonemAccountImportNotFound") {
    return Effect.fail(
      new SquadBuilderNotFound({ message: "Pending import not found" })
    );
  }

  if (invalidInputTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderInvalidInput({ message: tagged._tag }));
  }

  if (conflictTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderConflict({ message: tagged._tag }));
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

export const SquadBuilderAccountImportHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountImport",
  (handlers) =>
    handlers
      .handle("previewMargonemProfileImport", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            previewMargonemProfileImport.preview({
              actorUserId: toAppUserId(payload.actorUserId),
              profileUrl: payload.profileUrl,
            })
          )
        )
      )
      .handle("previewOwnedAccountImports", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            previewOwnedAccountImports.preview({
              actorUserId: toAppUserId(payload.actorUserId),
              profileUrls: payload.profileUrls,
            })
          )
        )
      )
      .handle("confirmOwnedAccountImport", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            confirmOwnedAccountImport.confirm({
              actorUserId: toAppUserId(payload.actorUserId),
              displayName: payload.displayName,
              pendingImportId: toPendingImportId(payload.pendingImportId),
            })
          )
        )
      )
      .handle("listOwnedAccounts", ({ payload, request }) =>
        withErrorMapping(
          withRequestCorrelation(
            request,
            AccountImportStoreService.use((store) =>
              store.listOwnedAccounts({
                actorUserId: toAppUserId(payload.actorUserId),
              })
            )
          )
        )
      )
).pipe(
  Layer.provide(
    Layer.mergeAll(
      previewMargonemProfileImportLayer,
      previewOwnedAccountImportsLayer,
      confirmOwnedAccountImportLayer
    )
  )
);
