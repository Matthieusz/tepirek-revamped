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
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/account-sharing/http-api-contract.js";
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

const notFoundTags = new Set([
  "MargonemAccountNotFound",
  "AccountAccessInviteNotFound",
  "InviteTargetNotFound",
]);

const forbiddenTags = new Set([
  "ActorDoesNotOwnMargonemAccount",
  "InviteTargetNotVerified",
  "ActorIsNotInviteRecipient",
]);

const conflictTags = new Set(["AccountAccessTransitionNotAllowed"]);

const invalidInputTags = new Set([
  "CannotInviteSelf",
  "InvalidMargonemAccountId",
  "InvalidMargonemAccountAccessId",
  "InvalidAppUserId",
  "InvalidAccountInviteTargetQuery",
]);

const toSquadBuilderFail = (
  error: unknown
): Effect.Effect<never, ProtocolError, never> => {
  if (typeof error !== "object" || error === null || !("_tag" in error)) {
    return Effect.fail(
      new SquadBuilderPersistenceUnavailable({
        cause: new Error("Unknown error"),
        operation: "unknown",
      })
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

  if (notFoundTags.has(tagged._tag)) {
    return Effect.fail(
      new SquadBuilderPersistenceUnavailable({
        cause: new Error(tagged._tag),
        operation: "unknown",
      })
    );
  }

  if (forbiddenTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderForbidden({ message: tagged._tag }));
  }

  if (conflictTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderConflict({ message: tagged._tag }));
  }

  if (invalidInputTags.has(tagged._tag)) {
    return Effect.fail(new SquadBuilderInvalidInput({ message: tagged._tag }));
  }

  return Effect.fail(
    new SquadBuilderPersistenceUnavailable({
      cause: new Error(`Unknown error: ${tagged._tag}`),
      operation: "unknown",
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

export const SquadBuilderAccountSharingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountSharing",
  (handlers) =>
    handlers
      .handle("searchAccountInviteTargets", ({ payload, request }) =>
        Effect.gen(function* searchAccountInviteTargetsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withErrorMapping(
            withRequestCorrelation(
              request,
              accountInviteTargets.search({
                accountId: toMargonemAccountId(payload.accountId),
                actorUserId: sessionAppUserId(session),
                query: payload.query,
              })
            )
          );
        })
      )
      .handle("sendAccountAccessInvite", ({ payload, request }) =>
        Effect.gen(function* sendAccountAccessInviteHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withErrorMapping(
            withRequestCorrelation(
              request,
              accountAccessInvites.send({
                accountId: toMargonemAccountId(payload.accountId),
                actorUserId: sessionAppUserId(session),
                invitedUserId: toAppUserId(payload.invitedUserId),
              })
            )
          );
        })
      )
      .handle("respondToAccountAccessInvite", ({ payload, request }) =>
        Effect.gen(function* respondToAccountAccessInviteHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withErrorMapping(
            withRequestCorrelation(
              request,
              accountAccessInviteResponses.respond({
                accessId: toMargonemAccountAccessId(payload.accessId),
                actorUserId: sessionAppUserId(session),
                response: payload.response,
              })
            )
          );
        })
      )
      .handle("revokeAccountAccess", ({ payload, request }) =>
        Effect.gen(function* revokeAccountAccessHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withErrorMapping(
            withRequestCorrelation(
              request,
              accountAccessRevocations.revoke({
                accessId: toMargonemAccountAccessId(payload.accessId),
                actorUserId: sessionAppUserId(session),
              })
            )
          );
        })
      )
      .handle("listIncomingAccountInvites", ({ request }) =>
        Effect.gen(function* listIncomingAccountInvitesHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withErrorMapping(
            withRequestCorrelation(
              request,
              accountSharingState.listIncomingInvites({
                actorUserId: sessionAppUserId(session),
              })
            )
          );
        })
      )
      .handle("listSharedAccounts", ({ request }) =>
        Effect.gen(function* listSharedAccountsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withErrorMapping(
            withRequestCorrelation(
              request,
              accountSharingState.listSharedAccounts({
                actorUserId: sessionAppUserId(session),
              })
            )
          );
        })
      )
      .handle("listAccountAccessGrants", ({ payload, request }) =>
        Effect.gen(function* listAccountAccessGrantsHandler() {
          const session = yield* requireSquadBuilderSession(request);
          return yield* withErrorMapping(
            withRequestCorrelation(
              request,
              accountSharingState.listAccountAccessGrants({
                accountId: toMargonemAccountId(payload.accountId),
                actorUserId: sessionAppUserId(session),
              })
            )
          );
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
