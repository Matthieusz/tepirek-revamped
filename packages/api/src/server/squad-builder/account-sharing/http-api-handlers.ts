/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
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
import { logSquadBuilderInternalFailure } from "../../../services/squad-builder/internal-error-logging.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountSharingError>;

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
      return new SquadBuilderPersistenceUnavailable({
        operation: "unknown",
      });
    }
  }
};

export const SquadBuilderAccountSharingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountSharing",
  (handlers) =>
    Effect.gen(function* SquadBuilderAccountSharingHttpApiHandlers() {
      const accountSharingStateSvc = yield* AccountSharingStateService;
      const accountAccessInviteResponsesSvc =
        yield* AccountAccessInviteResponsesService;
      const accountAccessRevocationsSvc =
        yield* AccountAccessRevocationsService;
      const accountInviteTargetsSvc = yield* AccountInviteTargetsService;
      const accountAccessInvitesSvc = yield* AccountAccessInvitesService;

      return handlers
        .handle("searchAccountInviteTargets", ({ payload, request }) =>
          Effect.gen(function* searchAccountInviteTargetsHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              accountInviteTargetsSvc.search({
                accountId: payload.accountId,
                actorUserId: sessionAppUserId(session),
                query: payload.query,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountSharingError)
            );
          })
        )
        .handle("sendAccountAccessInvite", ({ payload, request }) =>
          Effect.gen(function* sendAccountAccessInviteHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              accountAccessInvitesSvc.send({
                accountId: payload.accountId,
                actorUserId: sessionAppUserId(session),
                invitedUserId: payload.invitedUserId,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountSharingError)
            );
          })
        )
        .handle("respondToAccountAccessInvite", ({ payload, request }) =>
          Effect.gen(function* respondToAccountAccessInviteHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              accountAccessInviteResponsesSvc.respond({
                accessId: payload.accessId,
                actorUserId: sessionAppUserId(session),
                response: payload.response,
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountSharingError)
            );
          })
        )
        .handle("revokeAccountAccess", ({ payload, request }) =>
          Effect.gen(function* revokeAccountAccessHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              accountAccessRevocationsSvc.revoke({
                accessId: payload.accessId,
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountSharingError)
            );
          })
        )
        .handle("listIncomingAccountInvites", ({ request }) =>
          Effect.gen(function* listIncomingAccountInvitesHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              accountSharingStateSvc.listIncomingInvites({
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountSharingError)
            );
          })
        )
        .handle("listSharedAccounts", ({ request }) =>
          Effect.gen(function* listSharedAccountsHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              accountSharingStateSvc.listSharedAccounts({
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountSharingError)
            );
          })
        )
        .handle("listAccountAccessGrants", ({ payload, request }) =>
          Effect.gen(function* listAccountAccessGrantsHandler() {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              accountSharingStateSvc.listAccountAccessGrants({
                accountId: payload.accountId,
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(
              Effect.tapError(logSquadBuilderInternalFailure),
              Effect.mapError(mapAccountSharingError)
            );
          })
        );
    })
);
