/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderSquadGroupSharingError } from "../../../protocol/squad-builder/squad-group-sharing/http-api-contract.js";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/squad-group-sharing/http-api-contract.js";
import { Service as SquadGroupSharingStateService } from "../../../services/squad-builder/squad-groups/list-squad-group-sharing-state-service.js";
import { Service as SquadGroupEditorInviteResponsesService } from "../../../services/squad-builder/squad-groups/respond-to-squad-group-invite-service.js";
import { Service as SquadGroupEditorRevocationsService } from "../../../services/squad-builder/squad-groups/revoke-squad-group-editor-service.js";
import { Service as SquadEditorInviteTargetsService } from "../../../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.js";
import { Service as SquadGroupEditorInvitesService } from "../../../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.js";
import type { SquadGroupSharingError } from "../../../services/squad-builder/squad-groups/squad-group-sharing-error.js";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.js";

type ProtocolError = Schema.Schema.Type<
  typeof SquadBuilderSquadGroupSharingError
>;

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

// oxlint-disable-next-line eslint/complexity
const mapSquadGroupSharingError = (
  error: SquadGroupSharingError
): ProtocolError => {
  switch (error._tag) {
    case "SquadGroupNotFound":
    case "SquadGroupInvitationNotFound":
    case "SquadEditorInviteTargetNotFound": {
      return new SquadBuilderNotFound({ message: error._tag });
    }
    case "ActorDoesNotOwnSquadGroup":
    case "ActorCannotViewSquadGroup":
    case "ActorCannotEditSquadGroup":
    case "ActorIsNotSquadGroupInviteRecipient":
    case "SquadEditorInviteTargetNotVerified":
    case "EditorCannotChangeSquadStructure":
    case "SquadCharacterNotAccessible": {
      return new SquadBuilderForbidden({ message: error._tag });
    }
    case "SquadGroupInvitationTransitionNotAllowed": {
      return new SquadBuilderConflict({ message: error._tag });
    }
    case "CannotInviteSelf":
    case "SquadNotInGroup":
    case "InvalidSquadGroupName":
    case "InvalidSquadName":
    case "InvalidAppUserId":
    case "InvalidSquadGroupId":
    case "InvalidSquadGroupInvitationId":
    case "InvalidSquadId":
    case "InvalidAccountInviteTargetQuery":
    case "TooManyCharactersInSquad":
    case "DuplicateCharacterInSquad":
    case "DuplicateAccountInSquad":
    case "DuplicateCharacterInSquadGroup":
    case "SquadCharacterNotJaruna":
    case "InvalidSquadSnapshot": {
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

export const SquadBuilderSquadGroupSharingHttpApiHandlers =
  HttpApiBuilder.group(
    AppHttpApi,
    "squadBuilderSquadGroupSharing",
    (handlers) =>
      Effect.gen(function* SquadBuilderSquadGroupSharingHttpApiHandlers() {
        const squadGroupSharingStateSvc = yield* SquadGroupSharingStateService;
        const squadGroupEditorInviteResponsesSvc =
          yield* SquadGroupEditorInviteResponsesService;
        const squadGroupEditorRevocationsSvc =
          yield* SquadGroupEditorRevocationsService;
        const squadEditorInviteTargetsSvc =
          yield* SquadEditorInviteTargetsService;
        const squadGroupEditorInvitesSvc =
          yield* SquadGroupEditorInvitesService;

        return handlers
          .handle("searchSquadEditorInviteTargets", ({ payload, request }) =>
            Effect.gen(function* searchSquadEditorInviteTargetsHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadEditorInviteTargetsSvc.search({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                  query: payload.query,
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle("sendSquadGroupEditorInvite", ({ payload, request }) =>
            Effect.gen(function* sendSquadGroupEditorInviteHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadGroupEditorInvitesSvc.send({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                  invitedUserId: payload.invitedUserId,
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle("respondToSquadGroupInvite", ({ payload, request }) =>
            Effect.gen(function* respondToSquadGroupInviteHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadGroupEditorInviteResponsesSvc.respond({
                  actorUserId: sessionAppUserId(session),
                  invitationId: payload.invitationId,
                  response: payload.response,
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle("revokeSquadGroupEditor", ({ payload, request }) =>
            Effect.gen(function* revokeSquadGroupEditorHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadGroupEditorRevocationsSvc.revoke({
                  actorUserId: sessionAppUserId(session),
                  invitationId: payload.invitationId,
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle("listIncomingSquadGroupInvites", ({ request }) =>
            Effect.gen(function* listIncomingSquadGroupInvitesHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadGroupSharingStateSvc.listIncomingInvites({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle("listSharedSquadGroups", ({ request }) =>
            Effect.gen(function* listSharedSquadGroupsHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadGroupSharingStateSvc.listSharedGroups({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle("listSquadGroupEditorGrants", ({ payload, request }) =>
            Effect.gen(function* listSquadGroupEditorGrantsHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadGroupSharingStateSvc.listEditorGrants({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle("countPendingSquadGroupInvites", ({ request }) =>
            Effect.gen(function* countPendingSquadGroupInvitesHandler() {
              const session = yield* requireSquadBuilderSession(request);
              return yield* withRequestCorrelation(
                request,
                squadGroupSharingStateSvc.countPendingInvites({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          );
      })
  );
