/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import type { SquadBuilderAccountImportError } from "../../../protocol/squad-builder/account-import/http-api-contract.ts";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/account-import/http-api-contract.ts";
import { ConfirmOwnedAccountImportService } from "../../../services/squad-builder/account-import/confirm-owned-account-import-service.ts";
import type { ConfirmOwnedAccountImportError } from "../../../services/squad-builder/account-import/confirm-owned-account-import-service.ts";
import { DeleteOwnedAccountService } from "../../../services/squad-builder/account-import/delete-owned-account-service.ts";
import type { DeleteOwnedAccountError } from "../../../services/squad-builder/account-import/delete-owned-account-service.ts";
import type { ListOwnedMargonemAccountsError } from "../../../services/squad-builder/account-import/list-owned-margonem-accounts.ts";
import { ListOwnedMargonemAccountsService } from "../../../services/squad-builder/account-import/list-owned-margonem-accounts.ts";
import { PreviewMargonemProfileImportService } from "../../../services/squad-builder/account-import/preview-margonem-profile-import-service.ts";
import type { PreviewMargonemProfileImportError } from "../../../services/squad-builder/account-import/preview-margonem-profile-import-service.ts";
import { PreviewOwnedAccountImportsService } from "../../../services/squad-builder/account-import/preview-owned-account-imports-service.ts";
import type { PreviewOwnedAccountImportsError } from "../../../services/squad-builder/account-import/preview-owned-account-imports-service.ts";
import { UpdateOwnedAccountDisplayNameService } from "../../../services/squad-builder/account-import/update-owned-account-display-name-service.ts";
import type { UpdateOwnedAccountDisplayNameError } from "../../../services/squad-builder/account-import/update-owned-account-display-name-service.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountImportError>;

type AccountImportHandlerError =
  | PreviewMargonemProfileImportError
  | PreviewOwnedAccountImportsError
  | ConfirmOwnedAccountImportError
  | UpdateOwnedAccountDisplayNameError
  | DeleteOwnedAccountError
  | ListOwnedMargonemAccountsError;

const mapAccountImportError = (
  error: AccountImportHandlerError
): ProtocolError => {
  switch (error._tag) {
    case "PendingMargonemAccountImportNotFound":
    case "MargonemAccountNotFound": {
      return new SquadBuilderNotFound({ message: error._tag });
    }
    case "ActorDoesNotOwnMargonemAccount": {
      return new SquadBuilderForbidden({ message: error._tag });
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
    case "FirecrawlResponseNotParseable": {
      return new SquadBuilderUpstreamUnavailable({ message: error._tag });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new SquadBuilderPersistenceUnavailable({
        operation: error.operation,
      });
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

export const SquadBuilderAccountImportHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountImport",
  Effect.fnUntraced(
    function* SquadBuilderAccountImportHttpApiHandlers(handlers) {
      const previewMargonemProfileImportSvc =
        yield* PreviewMargonemProfileImportService;
      const previewOwnedAccountImportsSvc =
        yield* PreviewOwnedAccountImportsService;
      const confirmOwnedAccountImportSvc =
        yield* ConfirmOwnedAccountImportService;
      const updateOwnedAccountDisplayNameSvc =
        yield* UpdateOwnedAccountDisplayNameService;
      const deleteOwnedAccountSvc = yield* DeleteOwnedAccountService;
      const listOwnedMargonemAccountsSvc =
        yield* ListOwnedMargonemAccountsService;

      return handlers
        .handle(
          "previewMargonemProfileImport",
          Effect.fn("SquadBuilderAccountImport.previewMargonemProfileImport")(
            function* previewMargonemProfileImport({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                previewMargonemProfileImportSvc.preview({
                  actorUserId: sessionAppUserId(session),
                  profileUrl: payload.profileUrl,
                })
              ).pipe(Effect.mapError(mapAccountImportError));
            }
          )
        )
        .handle(
          "previewOwnedAccountImports",
          Effect.fn("SquadBuilderAccountImport.previewOwnedAccountImports")(
            function* previewOwnedAccountImports({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                previewOwnedAccountImportsSvc.preview({
                  actorUserId: sessionAppUserId(session),
                  profileUrls: payload.profileUrls,
                })
              ).pipe(Effect.mapError(mapAccountImportError));
            }
          )
        )
        .handle(
          "confirmOwnedAccountImport",
          Effect.fn("SquadBuilderAccountImport.confirmOwnedAccountImport")(
            function* confirmOwnedAccountImport({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                confirmOwnedAccountImportSvc.confirm({
                  actorUserId: sessionAppUserId(session),
                  displayName: payload.displayName,
                  pendingImportId: payload.pendingImportId,
                })
              ).pipe(Effect.mapError(mapAccountImportError));
            }
          )
        )
        .handle(
          "updateOwnedAccountDisplayName",
          Effect.fn("SquadBuilderAccountImport.updateOwnedAccountDisplayName")(
            function* updateOwnedAccountDisplayName({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                updateOwnedAccountDisplayNameSvc.update({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                  displayName: payload.displayName,
                })
              ).pipe(Effect.mapError(mapAccountImportError));
            }
          )
        )
        .handle(
          "deleteOwnedAccount",
          Effect.fn("SquadBuilderAccountImport.deleteOwnedAccount")(
            function* deleteOwnedAccount({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                deleteOwnedAccountSvc.delete({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapAccountImportError));
            }
          )
        )
        .handle(
          "listOwnedAccounts",
          Effect.fn("SquadBuilderAccountImport.listOwnedAccounts")(
            function* listOwnedAccounts({ request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                listOwnedMargonemAccountsSvc.list({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapAccountImportError));
            }
          )
        );
    }
  )
);
