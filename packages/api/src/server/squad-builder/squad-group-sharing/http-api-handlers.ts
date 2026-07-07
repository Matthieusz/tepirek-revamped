/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.js";
import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderSquadGroupSharingError } from "../../../protocol/squad-builder/squad-group-sharing/http-api-contract.js";
import {
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderConflict,
} from "../../../protocol/squad-builder/squad-group-sharing/http-api-contract.js";
import {
  layer as squadGroupSharingStateLayer,
  use as squadGroupSharingState,
} from "../../../services/squad-builder/squad-groups/list-squad-group-sharing-state-service.js";
import {
  layer as squadGroupEditorInviteResponsesLayer,
  use as squadGroupEditorInviteResponses,
} from "../../../services/squad-builder/squad-groups/respond-to-squad-group-invite-service.js";
import {
  layer as squadGroupEditorRevocationsLayer,
  use as squadGroupEditorRevocations,
} from "../../../services/squad-builder/squad-groups/revoke-squad-group-editor-service.js";
import {
  layer as squadEditorInviteTargetsLayer,
  use as squadEditorInviteTargets,
} from "../../../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.js";
import {
  layer as squadGroupEditorInvitesLayer,
  use as squadGroupEditorInvites,
} from "../../../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.js";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.js";

type ProtocolError = Schema.Schema.Type<
  typeof SquadBuilderSquadGroupSharingError
>;

const toAppUserId = (value: string): AppUserId =>
  // SAFETY: HttpApi decoded this value with AppUserIdSchema before the handler runs.
  value as AppUserId;

const toSquadGroupId = (value: number): SquadGroupId =>
  // SAFETY: HttpApi decoded this value with SquadGroupIdSchema before the handler runs.
  value as SquadGroupId;

const toSquadGroupInvitationId = (value: number): SquadGroupInvitationId =>
  // SAFETY: HttpApi decoded this value with SquadGroupInvitationIdSchema before the handler runs.
  value as SquadGroupInvitationId;

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
  "SquadGroupNotFound",
  "SquadGroupInvitationNotFound",
  "SquadEditorInviteTargetNotFound",
]);

const forbiddenTags = new Set([
  "ActorDoesNotOwnSquadGroup",
  "ActorCannotViewSquadGroup",
  "ActorCannotEditSquadGroup",
  "ActorIsNotSquadGroupInviteRecipient",
  "SquadEditorInviteTargetNotVerified",
  "ActorDoesNotOwnSquadGroup",
]);

const conflictTags = new Set(["SquadGroupInvitationTransitionNotAllowed"]);

const invalidInputTags = new Set([
  "CannotInviteSelf",
  "InvalidAppUserId",
  "InvalidSquadGroupId",
  "InvalidSquadGroupInvitationId",
]);

const toSquadBuilderFail = (
  error: unknown
): Effect.Effect<never, ProtocolError, never> => {
  if (typeof error !== "object" || error === null || !("_tag" in error)) {
    return Effect.fail(new SquadBuilderNotFound({ message: "Unknown error" }));
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
    return Effect.fail(new SquadBuilderNotFound({ message: tagged._tag }));
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
    new SquadBuilderNotFound({
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

export const SquadBuilderSquadGroupSharingHttpApiHandlers =
  HttpApiBuilder.group(
    AppHttpApi,
    "squadBuilderSquadGroupSharing",
    (handlers) =>
      handlers
        .handle("searchSquadEditorInviteTargets", ({ payload, request }) =>
          Effect.gen(function* searchSquadEditorInviteTargetsHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadEditorInviteTargets.search({
                  actorUserId: sessionAppUserId(session),
                  groupId: toSquadGroupId(payload.groupId),
                  query: payload.query,
                })
              )
            );
          })
        )
        .handle("sendSquadGroupEditorInvite", ({ payload, request }) =>
          Effect.gen(function* sendSquadGroupEditorInviteHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadGroupEditorInvites.send({
                  actorUserId: sessionAppUserId(session),
                  groupId: toSquadGroupId(payload.groupId),
                  invitedUserId: toAppUserId(payload.invitedUserId),
                })
              )
            );
          })
        )
        .handle("respondToSquadGroupInvite", ({ payload, request }) =>
          Effect.gen(function* respondToSquadGroupInviteHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadGroupEditorInviteResponses.respond({
                  actorUserId: sessionAppUserId(session),
                  invitationId: toSquadGroupInvitationId(payload.invitationId),
                  response: payload.response,
                })
              )
            );
          })
        )
        .handle("revokeSquadGroupEditor", ({ payload, request }) =>
          Effect.gen(function* revokeSquadGroupEditorHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadGroupEditorRevocations.revoke({
                  actorUserId: sessionAppUserId(session),
                  invitationId: toSquadGroupInvitationId(payload.invitationId),
                })
              )
            );
          })
        )
        .handle("listIncomingSquadGroupInvites", ({ request }) =>
          Effect.gen(function* listIncomingSquadGroupInvitesHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadGroupSharingState.listIncomingInvites({
                  actorUserId: sessionAppUserId(session),
                })
              )
            );
          })
        )
        .handle("listSharedSquadGroups", ({ request }) =>
          Effect.gen(function* listSharedSquadGroupsHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadGroupSharingState.listSharedGroups({
                  actorUserId: sessionAppUserId(session),
                })
              )
            );
          })
        )
        .handle("listSquadGroupEditorGrants", ({ payload, request }) =>
          Effect.gen(function* listSquadGroupEditorGrantsHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadGroupSharingState.listEditorGrants({
                  actorUserId: sessionAppUserId(session),
                  groupId: toSquadGroupId(payload.groupId),
                })
              )
            );
          })
        )
        .handle("countPendingSquadGroupInvites", ({ request }) =>
          Effect.gen(function* countPendingSquadGroupInvitesHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withErrorMapping(
              withRequestCorrelation(
                request,
                squadGroupSharingState.countPendingInvites({
                  actorUserId: sessionAppUserId(session),
                })
              )
            );
          })
        )
  ).pipe(
    Layer.provide(
      Layer.mergeAll(
        squadEditorInviteTargetsLayer,
        squadGroupEditorInvitesLayer,
        squadGroupEditorInviteResponsesLayer,
        squadGroupEditorRevocationsLayer,
        squadGroupSharingStateLayer
      )
    )
  );
