/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.js";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";
import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderAccountSharingError } from "../../../protocol/squad-builder/account-sharing/http-api-contract.js";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/account-sharing/http-api-contract.js";
import type { AccountSharingError } from "../../../services/squad-builder/account-sharing/account-sharing-error.js";
import {
  layer as accountSharingStateLayer,
  use as accountSharingState,
} from "../../../services/squad-builder/account-sharing/list-account-sharing-state-service.js";
import {
  layer as accountAccessInviteResponsesLayer,
  use as accountAccessInviteResponses,
} from "../../../services/squad-builder/account-sharing/respond-to-account-access-invite-service.js";
import {
  layer as accountAccessRevocationsLayer,
  use as accountAccessRevocations,
} from "../../../services/squad-builder/account-sharing/revoke-account-access-service.js";
import {
  layer as accountInviteTargetsLayer,
  use as accountInviteTargets,
} from "../../../services/squad-builder/account-sharing/search-account-invite-targets-service.js";
import {
  layer as accountAccessInvitesLayer,
  use as accountAccessInvites,
} from "../../../services/squad-builder/account-sharing/send-account-access-invite-service.js";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.js";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountSharingError>;

const toAppUserId = (value: string): AppUserId =>
  // SAFETY: HttpApi decoded this value with AppUserIdSchema before the handler runs.
  value as AppUserId;

const toMargonemAccountId = (value: number): MargonemAccountId =>
  // SAFETY: HttpApi decoded this value with MargonemAccountIdSchema before the handler runs.
  value as MargonemAccountId;

const toMargonemAccountAccessId = (value: number): MargonemAccountAccessId =>
  // SAFETY: HttpApi decoded this value with MargonemAccountAccessIdSchema before the handler runs.
  value as MargonemAccountAccessId;

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
        cause: error.cause,
        operation: error.operation,
      });
    }
    default: {
      return new SquadBuilderPersistenceUnavailable({
        cause: new Error("Unreachable error tag"),
        operation: "unknown",
      });
    }
  }
};

export const SquadBuilderAccountSharingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountSharing",
  (handlers) =>
    handlers
      .handle("searchAccountInviteTargets", ({ payload, request }) =>
        Effect.gen(function* searchAccountInviteTargetsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            accountInviteTargets.search({
              accountId: toMargonemAccountId(payload.accountId),
              actorUserId: sessionAppUserId(session),
              query: payload.query,
            })
          ).pipe(Effect.mapError(mapAccountSharingError));
        })
      )
      .handle("sendAccountAccessInvite", ({ payload, request }) =>
        Effect.gen(function* sendAccountAccessInviteHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            accountAccessInvites.send({
              accountId: toMargonemAccountId(payload.accountId),
              actorUserId: sessionAppUserId(session),
              invitedUserId: toAppUserId(payload.invitedUserId),
            })
          ).pipe(Effect.mapError(mapAccountSharingError));
        })
      )
      .handle("respondToAccountAccessInvite", ({ payload, request }) =>
        Effect.gen(function* respondToAccountAccessInviteHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            accountAccessInviteResponses.respond({
              accessId: toMargonemAccountAccessId(payload.accessId),
              actorUserId: sessionAppUserId(session),
              response: payload.response,
            })
          ).pipe(Effect.mapError(mapAccountSharingError));
        })
      )
      .handle("revokeAccountAccess", ({ payload, request }) =>
        Effect.gen(function* revokeAccountAccessHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            accountAccessRevocations.revoke({
              accessId: toMargonemAccountAccessId(payload.accessId),
              actorUserId: sessionAppUserId(session),
            })
          ).pipe(Effect.mapError(mapAccountSharingError));
        })
      )
      .handle("listIncomingAccountInvites", ({ request }) =>
        Effect.gen(function* listIncomingAccountInvitesHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            accountSharingState.listIncomingInvites({
              actorUserId: sessionAppUserId(session),
            })
          ).pipe(Effect.mapError(mapAccountSharingError));
        })
      )
      .handle("listSharedAccounts", ({ request }) =>
        Effect.gen(function* listSharedAccountsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            accountSharingState.listSharedAccounts({
              actorUserId: sessionAppUserId(session),
            })
          ).pipe(Effect.mapError(mapAccountSharingError));
        })
      )
      .handle("listAccountAccessGrants", ({ payload, request }) =>
        Effect.gen(function* listAccountAccessGrantsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withRequestCorrelation(
            request,
            accountSharingState.listAccountAccessGrants({
              accountId: toMargonemAccountId(payload.accountId),
              actorUserId: sessionAppUserId(session),
            })
          ).pipe(Effect.mapError(mapAccountSharingError));
        })
      )
).pipe(
  Layer.provide(
    Layer.mergeAll(
      accountInviteTargetsLayer,
      accountAccessInvitesLayer,
      accountAccessInviteResponsesLayer,
      accountAccessRevocationsLayer,
      accountSharingStateLayer
    )
  )
);
