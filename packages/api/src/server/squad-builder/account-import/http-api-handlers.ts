/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

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
import { Service as ConfirmOwnedAccountImportService } from "../../../services/squad-builder/account-import/confirm-owned-account-import-service.js";
import { Service as PreviewMargonemProfileImportService } from "../../../services/squad-builder/account-import/preview-margonem-profile-import-service.js";
import type { PreviewMargonemProfileImportError } from "../../../services/squad-builder/account-import/preview-margonem-profile-import.js";
import { Service as PreviewOwnedAccountImportsService } from "../../../services/squad-builder/account-import/preview-owned-account-imports-service.js";
import type { PreviewOwnedAccountImportsError } from "../../../services/squad-builder/account-import/preview-owned-account-imports.js";
import { logSquadBuilderInternalFailure } from "../../../services/squad-builder/internal-error-logging.js";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.js";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountImportError>;

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
    Effect.gen(function* SquadBuilderAccountImportHttpApiHandlers() {
      const previewMargonemProfileImportSvc =
        yield* PreviewMargonemProfileImportService;
      const previewOwnedAccountImportsSvc =
        yield* PreviewOwnedAccountImportsService;
      const confirmOwnedAccountImportSvc =
        yield* ConfirmOwnedAccountImportService;

      return handlers
        .handle("previewMargonemProfileImport", ({ payload, request }) =>
          Effect.gen(function* previewMargonemProfileImportHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              previewMargonemProfileImportSvc.preview({
                actorUserId: sessionAppUserId(session),
                profileUrl: payload.profileUrl,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountImportError)
            );
          })
        )
        .handle("previewOwnedAccountImports", ({ payload, request }) =>
          Effect.gen(function* previewOwnedAccountImportsHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              previewOwnedAccountImportsSvc.preview({
                actorUserId: sessionAppUserId(session),
                profileUrls: payload.profileUrls,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountImportError)
            );
          })
        )
        .handle("confirmOwnedAccountImport", ({ payload, request }) =>
          Effect.gen(function* confirmOwnedAccountImportHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              confirmOwnedAccountImportSvc.confirm({
                actorUserId: sessionAppUserId(session),
                displayName: payload.displayName,
                pendingImportId: payload.pendingImportId,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountImportError)
            );
          })
        )
        .handle("listOwnedAccounts", ({ request }) =>
          Effect.gen(function* listOwnedAccountsHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              AccountImportStoreService.use((store) =>
                store.listOwnedAccounts({
                  actorUserId: sessionAppUserId(session),
                })
              )
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountImportError)
            );
          })
        );
    })
);
