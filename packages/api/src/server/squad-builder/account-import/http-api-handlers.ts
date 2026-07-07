/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.js";
import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderAccountImportError } from "../../../protocol/squad-builder/account-import/http-api-contract.js";
import {
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/account-import/http-api-contract.js";
import { AccountImportStoreService } from "../../../services/squad-builder/account-import/account-import-store-service.js";
import type { ConfirmOwnedAccountImportServiceError } from "../../../services/squad-builder/account-import/confirm-owned-account-import-service.js";
import {
  layer as confirmOwnedAccountImportLayer,
  use as confirmOwnedAccountImport,
} from "../../../services/squad-builder/account-import/confirm-owned-account-import-service.js";
import {
  layer as previewMargonemProfileImportLayer,
  use as previewMargonemProfileImport,
} from "../../../services/squad-builder/account-import/preview-margonem-profile-import-service.js";
import type { PreviewMargonemProfileImportError } from "../../../services/squad-builder/account-import/preview-margonem-profile-import.js";
import {
  layer as previewOwnedAccountImportsLayer,
  use as previewOwnedAccountImports,
} from "../../../services/squad-builder/account-import/preview-owned-account-imports-service.js";
import type { PreviewOwnedAccountImportsError } from "../../../services/squad-builder/account-import/preview-owned-account-imports.js";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.js";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountImportError>;

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

type AccountImportHandlerError =
  | PreviewMargonemProfileImportError
  | PreviewOwnedAccountImportsError
  | ConfirmOwnedAccountImportServiceError;

const mapAccountImportError = (
  error: AccountImportHandlerError
): ProtocolError => {
  switch (error._tag) {
    case "PendingMargonemAccountImportNotFound": {
      return new SquadBuilderNotFound({ message: "Pending import not found" });
    }
    case "InvalidMargonemProfileUrl":
    case "MissingMargonemProfileId":
    case "MargonemProfileNameNotFound":
    case "MargonemCharacterRowsNotFound":
    case "MargonemCharacterRowInvalid":
    case "InvalidAccountDisplayName":
    case "EmptyProfileUrlBatch":
    case "TooManyProfileUrlsInBatch": {
      return new SquadBuilderInvalidInput({ message: error._tag });
    }
    case "MargonemAccountAlreadyOwnedByActor":
    case "MargonemAccountAlreadySharedWithActor":
    case "MargonemAccountOwnedByAnotherUser": {
      return new SquadBuilderConflict({ message: error._tag });
    }
    case "FirecrawlMonthlyBudgetExhausted":
    case "FirecrawlRequestFailed":
    case "FirecrawlResponseNotParseable":
    case "RequestCancelled": {
      return new SquadBuilderUpstreamUnavailable({ message: error._tag });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new SquadBuilderPersistenceUnavailable({
        cause: error.cause,
        operation: error.operation,
      });
    }
    default: {
      return new SquadBuilderUpstreamUnavailable({
        message: "Unreachable error tag",
      });
    }
  }
};

export const SquadBuilderAccountImportHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountImport",
  (handlers) =>
    handlers
      .handle("previewMargonemProfileImport", ({ payload, request }) =>
        Effect.gen(function* previewMargonemProfileImportHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            previewMargonemProfileImport.preview({
              actorUserId: sessionAppUserId(session),
              profileUrl: payload.profileUrl,
            })
          ).pipe(Effect.mapError(mapAccountImportError));
        })
      )
      .handle("previewOwnedAccountImports", ({ payload, request }) =>
        Effect.gen(function* previewOwnedAccountImportsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            previewOwnedAccountImports.preview({
              actorUserId: sessionAppUserId(session),
              profileUrls: payload.profileUrls,
            })
          ).pipe(Effect.mapError(mapAccountImportError));
        })
      )
      .handle("confirmOwnedAccountImport", ({ payload, request }) =>
        Effect.gen(function* confirmOwnedAccountImportHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            confirmOwnedAccountImport.confirm({
              actorUserId: sessionAppUserId(session),
              displayName: payload.displayName,
              pendingImportId: toPendingImportId(payload.pendingImportId),
            })
          ).pipe(Effect.mapError(mapAccountImportError));
        })
      )
      .handle("listOwnedAccounts", ({ request }) =>
        Effect.gen(function* listOwnedAccountsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            AccountImportStoreService.use((store) =>
              store.listOwnedAccounts({
                actorUserId: sessionAppUserId(session),
              })
            )
          ).pipe(Effect.mapError(mapAccountImportError));
        })
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
