/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import type { SquadBuilderAccountSharingError } from "../../../protocol/squad-builder/account-sharing/http-api-contract.ts";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/account-sharing/http-api-contract.ts";
import type { AccountSharingError } from "../../../services/squad-builder/account-sharing/account-sharing-error.ts";
import { AccountSharingStateService } from "../../../services/squad-builder/account-sharing/list-account-sharing-state-service.ts";
import { AccountAccessInviteResponsesService } from "../../../services/squad-builder/account-sharing/respond-to-account-access-invite-service.ts";
import { AccountAccessRevocationsService } from "../../../services/squad-builder/account-sharing/revoke-account-access-service.ts";
import { AccountInviteTargetsService } from "../../../services/squad-builder/account-sharing/search-account-invite-targets-service.ts";
import { AccountAccessInvitesService } from "../../../services/squad-builder/account-sharing/send-account-access-invite-service.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountSharingError>;

const mapAccountSharingError = (error: AccountSharingError): ProtocolError => {
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
    case "InvalidMargonemAccountId":
    case "InvalidMargonemAccountAccessId":
    case "InvalidAppUserId":
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
};

export const SquadBuilderAccountSharingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountSharing",
  Effect.fnUntraced(
    function* SquadBuilderAccountSharingHttpApiHandlers(handlers) {
      const accountSharingStateSvc = yield* AccountSharingStateService;
      const accountAccessInviteResponsesSvc =
        yield* AccountAccessInviteResponsesService;
      const accountAccessRevocationsSvc =
        yield* AccountAccessRevocationsService;
      const accountInviteTargetsSvc = yield* AccountInviteTargetsService;
      const accountAccessInvitesSvc = yield* AccountAccessInvitesService;

      return handlers
        .handle(
          "searchAccountInviteTargets",
          Effect.fn("SquadBuilderAccountSharing.searchAccountInviteTargets")(
            function* searchAccountInviteTargets({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                accountInviteTargetsSvc.search({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                  query: payload.query,
                })
              ).pipe(Effect.mapError(mapAccountSharingError));
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
                accountAccessInvitesSvc.send({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                  invitedUserId: payload.invitedUserId,
                })
              ).pipe(Effect.mapError(mapAccountSharingError));
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
                accountAccessInviteResponsesSvc.respond({
                  accessId: payload.accessId,
                  actorUserId: sessionAppUserId(session),
                  response: payload.response,
                })
              ).pipe(Effect.mapError(mapAccountSharingError));
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
                accountAccessRevocationsSvc.revoke({
                  accessId: payload.accessId,
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapAccountSharingError));
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
                accountSharingStateSvc.listIncomingInvites({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapAccountSharingError));
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
                accountSharingStateSvc.listSharedAccounts({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapAccountSharingError));
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
                accountSharingStateSvc.listAccountAccessGrants({
                  accountId: payload.accountId,
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapAccountSharingError));
            }
          )
        );
    }
  )
);
