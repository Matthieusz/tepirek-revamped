/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderRateLimited,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/errors.ts";
import {
  deleteOwnedAccount as deleteOwnedAccountWorkflow,
  listOwnedAccounts as listOwnedAccountsWorkflow,
} from "../../../services/squad-builder/account-import/account-import-queries.ts";
import { confirm as confirmOwnedAccountImportWorkflow } from "../../../services/squad-builder/account-import/confirm-owned-account-import-service.ts";
import type { ConfirmOwnedAccountImportError } from "../../../services/squad-builder/account-import/confirm-owned-account-import-service.ts";
import { preview as previewMargonemProfileImportWorkflow } from "../../../services/squad-builder/account-import/preview-margonem-profile-import-service.ts";
import type { PreviewMargonemProfileImportError } from "../../../services/squad-builder/account-import/preview-margonem-profile-import-service.ts";
import { preview as previewOwnedAccountImportsWorkflow } from "../../../services/squad-builder/account-import/preview-owned-account-imports-service.ts";
import type { PreviewOwnedAccountImportsError } from "../../../services/squad-builder/account-import/preview-owned-account-imports-service.ts";
import { update as updateOwnedAccountDisplayNameWorkflow } from "../../../services/squad-builder/account-import/update-owned-account-display-name-service.ts";
import type { UpdateOwnedAccountDisplayNameError } from "../../../services/squad-builder/account-import/update-owned-account-display-name-service.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type DeleteOwnedAccountError = Effect.Error<
  ReturnType<typeof deleteOwnedAccountWorkflow>
>;
type ListOwnedAccountsError = Effect.Error<
  ReturnType<typeof listOwnedAccountsWorkflow>
>;

type AccountImportHandlerError =
  | PreviewMargonemProfileImportError
  | PreviewOwnedAccountImportsError
  | ConfirmOwnedAccountImportError
  | UpdateOwnedAccountDisplayNameError
  | DeleteOwnedAccountError
  | ListOwnedAccountsError;

type PreviewMargonemProfileImportProtocolError =
  | SquadBuilderConflict
  | SquadBuilderInvalidInput
  | SquadBuilderRateLimited
  | SquadBuilderUpstreamUnavailable
  | SquadBuilderPersistenceUnavailable;
type PreviewOwnedAccountImportsProtocolError =
  | SquadBuilderInvalidInput
  | SquadBuilderPersistenceUnavailable;
type ConfirmOwnedAccountImportProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderConflict
  | SquadBuilderInvalidInput
  | SquadBuilderPersistenceUnavailable;
type UpdateOwnedAccountDisplayNameProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderInvalidInput
  | SquadBuilderPersistenceUnavailable;
type DeleteOwnedAccountProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderPersistenceUnavailable;

function mapAccountImportError(
  error: ListOwnedAccountsError
): SquadBuilderPersistenceUnavailable;
function mapAccountImportError(
  error: DeleteOwnedAccountError
): DeleteOwnedAccountProtocolError;
function mapAccountImportError(
  error: PreviewOwnedAccountImportsError
): PreviewOwnedAccountImportsProtocolError;
function mapAccountImportError(
  error: UpdateOwnedAccountDisplayNameError
): UpdateOwnedAccountDisplayNameProtocolError;
function mapAccountImportError(
  error: ConfirmOwnedAccountImportError
): ConfirmOwnedAccountImportProtocolError;
function mapAccountImportError(
  error: PreviewMargonemProfileImportError
): PreviewMargonemProfileImportProtocolError;
function mapAccountImportError(
  error: AccountImportHandlerError
):
  | PreviewMargonemProfileImportProtocolError
  | SquadBuilderNotFound
  | SquadBuilderForbidden {
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
    case "FirecrawlUserMonthlyBudgetExhausted": {
      return new SquadBuilderRateLimited({ message: error._tag });
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
}

const mapPreviewMargonemProfileImportError = (
  error: PreviewMargonemProfileImportError
): PreviewMargonemProfileImportProtocolError => mapAccountImportError(error);
const mapPreviewOwnedAccountImportsError = (
  error: PreviewOwnedAccountImportsError
): PreviewOwnedAccountImportsProtocolError => mapAccountImportError(error);
const mapConfirmOwnedAccountImportError = (
  error: ConfirmOwnedAccountImportError
): ConfirmOwnedAccountImportProtocolError => mapAccountImportError(error);
const mapUpdateOwnedAccountDisplayNameError = (
  error: UpdateOwnedAccountDisplayNameError
): UpdateOwnedAccountDisplayNameProtocolError => mapAccountImportError(error);
const mapDeleteOwnedAccountError = (
  error: DeleteOwnedAccountError
): DeleteOwnedAccountProtocolError => mapAccountImportError(error);
const mapListOwnedAccountsError = (
  error: ListOwnedAccountsError
): SquadBuilderPersistenceUnavailable => mapAccountImportError(error);

export const SquadBuilderAccountImportHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountImport",
  (handlers) =>
    handlers
      .handle(
        "previewMargonemProfileImport",
        Effect.fn("SquadBuilderAccountImport.previewMargonemProfileImport")(
          function* previewMargonemProfileImport({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              previewMargonemProfileImportWorkflow({
                actorUserId: sessionAppUserId(session),
                profileUrl: payload.profileUrl,
              })
            ).pipe(Effect.mapError(mapPreviewMargonemProfileImportError));
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
              previewOwnedAccountImportsWorkflow({
                actorUserId: sessionAppUserId(session),
                profileUrls: payload.profileUrls,
              })
            ).pipe(Effect.mapError(mapPreviewOwnedAccountImportsError));
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
              confirmOwnedAccountImportWorkflow({
                actorUserId: sessionAppUserId(session),
                displayName: payload.displayName,
                pendingImportId: payload.pendingImportId,
              })
            ).pipe(Effect.mapError(mapConfirmOwnedAccountImportError));
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
              updateOwnedAccountDisplayNameWorkflow({
                accountId: payload.accountId,
                actorUserId: sessionAppUserId(session),
                displayName: payload.displayName,
              })
            ).pipe(Effect.mapError(mapUpdateOwnedAccountDisplayNameError));
          }
        )
      )
      .handle(
        "deleteOwnedAccount",
        Effect.fn("SquadBuilderAccountImport.deleteOwnedAccount")(
          function* deleteOwnedAccountHandler({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              deleteOwnedAccountWorkflow({
                accountId: payload.accountId,
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(Effect.mapError(mapDeleteOwnedAccountError));
          }
        )
      )
      .handle(
        "listOwnedAccounts",
        Effect.fn("SquadBuilderAccountImport.listOwnedAccounts")(
          function* listOwnedAccountsHandler({ request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              listOwnedAccountsWorkflow({
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(Effect.mapError(mapListOwnedAccountsError));
          }
        )
      )
);
