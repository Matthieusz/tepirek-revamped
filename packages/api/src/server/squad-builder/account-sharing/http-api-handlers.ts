/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/errors.ts";
import {
  respond,
  revoke,
} from "../../../services/squad-builder/account-sharing/account-sharing-operations.ts";
import { AccountSharingStoreService } from "../../../services/squad-builder/account-sharing/account-sharing-store.ts";
import { listAccountAccessGrants as listAccountAccessGrantsWorkflow } from "../../../services/squad-builder/account-sharing/list-account-access-grants.ts";
import { search } from "../../../services/squad-builder/account-sharing/search-account-invite-targets-service.ts";
import { send } from "../../../services/squad-builder/account-sharing/send-account-access-invite-service.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type SearchAccountInviteTargetsError = Effect.Error<ReturnType<typeof search>>;
type SendAccountAccessInviteError = Effect.Error<ReturnType<typeof send>>;
type RespondToAccountAccessInviteError = Effect.Error<
  ReturnType<typeof respond>
>;
type RevokeAccountAccessError = Effect.Error<ReturnType<typeof revoke>>;
type AccountSharingStore = typeof AccountSharingStoreService.Service;
type ListIncomingAccountInvitesError = Effect.Error<
  ReturnType<AccountSharingStore["listIncomingAccountInvites"]>
>;
type ListSharedAccountsError = Effect.Error<
  ReturnType<AccountSharingStore["listSharedAccounts"]>
>;
type ListAccountAccessGrantsError = Effect.Error<
  ReturnType<typeof listAccountAccessGrantsWorkflow>
>;
type AccountSharingHandlerError =
  | SearchAccountInviteTargetsError
  | SendAccountAccessInviteError
  | RespondToAccountAccessInviteError
  | RevokeAccountAccessError
  | ListIncomingAccountInvitesError
  | ListAccountAccessGrantsError;

type SearchAccountInviteTargetsProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderInvalidInput
  | SquadBuilderPersistenceUnavailable;
type SendAccountAccessInviteProtocolError =
  | SearchAccountInviteTargetsProtocolError
  | SquadBuilderConflict;
type RespondToAccountAccessInviteProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderConflict
  | SquadBuilderPersistenceUnavailable;
type ListAccountAccessGrantsProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderPersistenceUnavailable;

function mapAccountSharingError(
  error: ListIncomingAccountInvitesError
): SquadBuilderPersistenceUnavailable;
function mapAccountSharingError(
  error: ListAccountAccessGrantsError
): ListAccountAccessGrantsProtocolError;
function mapAccountSharingError(
  error: SearchAccountInviteTargetsError
): SearchAccountInviteTargetsProtocolError;
function mapAccountSharingError(
  error: RespondToAccountAccessInviteError | RevokeAccountAccessError
): RespondToAccountAccessInviteProtocolError;
function mapAccountSharingError(
  error: SendAccountAccessInviteError
): SendAccountAccessInviteProtocolError;
function mapAccountSharingError(
  error: AccountSharingHandlerError
): SendAccountAccessInviteProtocolError {
  switch (error._tag) {
    case "MargonemAccountNotFound":
    case "AccountAccessInviteNotFound":
    case "InviteTargetNotFound": {
      return new SquadBuilderNotFound({ message: error._tag });
    }
    case "ActorDoesNotOwnMargonemAccount":
    case "InviteTargetNotVerified":
    case "ActorIsNotInviteRecipient": {
      return new SquadBuilderForbidden({ message: error._tag });
    }
    case "AccountAccessTransitionNotAllowed": {
      return new SquadBuilderConflict({ message: error._tag });
    }
    case "CannotInviteSelf":
    case "InvalidAccountInviteTargetQuery": {
      return new SquadBuilderInvalidInput({ message: error._tag });
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

const mapSearchAccountInviteTargetsError = (
  error: SearchAccountInviteTargetsError
): SearchAccountInviteTargetsProtocolError => mapAccountSharingError(error);
const mapSendAccountAccessInviteError = (
  error: SendAccountAccessInviteError
): SendAccountAccessInviteProtocolError => mapAccountSharingError(error);
const mapRespondToAccountAccessInviteError = (
  error: RespondToAccountAccessInviteError
): RespondToAccountAccessInviteProtocolError => mapAccountSharingError(error);
const mapRevokeAccountAccessError = (
  error: RevokeAccountAccessError
): RespondToAccountAccessInviteProtocolError => mapAccountSharingError(error);
const mapListIncomingAccountInvitesError = (
  error: ListIncomingAccountInvitesError
): SquadBuilderPersistenceUnavailable => mapAccountSharingError(error);
const mapListSharedAccountsError = (
  error: ListSharedAccountsError
): SquadBuilderPersistenceUnavailable => mapAccountSharingError(error);
const mapListAccountAccessGrantsError = (
  error: ListAccountAccessGrantsError
): ListAccountAccessGrantsProtocolError => mapAccountSharingError(error);

export const SquadBuilderAccountSharingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountSharing",
  Effect.fnUntraced(
    function* SquadBuilderAccountSharingHttpApiHandlers(handlers) {
      const accountSharingStore = yield* AccountSharingStoreService;

      return handlers
        .handle(
          "searchAccountInviteTargets",
          Effect.fn("SquadBuilderAccountSharing.searchAccountInviteTargets")(
            function* searchAccountInviteTargets({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                search({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                  query: payload.query,
                })
              ).pipe(Effect.mapError(mapSearchAccountInviteTargetsError));
            }
          )
        )
        .handle(
          "sendAccountAccessInvite",
          Effect.fn("SquadBuilderAccountSharing.sendAccountAccessInvite")(
            function* sendAccountAccessInvite({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                send({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                  invitedUserId: payload.invitedUserId,
                })
              ).pipe(Effect.mapError(mapSendAccountAccessInviteError));
            }
          )
        )
        .handle(
          "respondToAccountAccessInvite",
          Effect.fn("SquadBuilderAccountSharing.respondToAccountAccessInvite")(
            function* respondToAccountAccessInvite({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                respond({
                  accessId: payload.accessId,
                  actorUserId: sessionAppUserId(session),
                  response: payload.response,
                })
              ).pipe(Effect.mapError(mapRespondToAccountAccessInviteError));
            }
          )
        )
        .handle(
          "revokeAccountAccess",
          Effect.fn("SquadBuilderAccountSharing.revokeAccountAccess")(
            function* revokeAccountAccess({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                revoke({
                  accessId: payload.accessId,
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapRevokeAccountAccessError));
            }
          )
        )
        .handle(
          "listIncomingAccountInvites",
          Effect.fn("SquadBuilderAccountSharing.listIncomingAccountInvites")(
            function* listIncomingAccountInvites({ request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                accountSharingStore.listIncomingAccountInvites({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapListIncomingAccountInvitesError));
            }
          )
        )
        .handle(
          "listSharedAccounts",
          Effect.fn("SquadBuilderAccountSharing.listSharedAccounts")(
            function* listSharedAccounts({ request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                accountSharingStore.listSharedAccounts({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapListSharedAccountsError));
            }
          )
        )
        .handle(
          "listAccountAccessGrants",
          Effect.fn("SquadBuilderAccountSharing.listAccountAccessGrants")(
            function* listAccountAccessGrants({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                listAccountAccessGrantsWorkflow({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapListAccountAccessGrantsError));
            }
          )
        );
    }
  )
);
