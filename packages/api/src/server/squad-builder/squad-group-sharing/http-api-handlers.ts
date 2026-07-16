/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import type { SquadBuilderSquadGroupSharingError } from "../../../protocol/squad-builder/squad-group-sharing/http-api-contract.ts";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/squad-group-sharing/http-api-contract.ts";
import { SquadGroupSharingStateService } from "../../../services/squad-builder/squad-groups/list-squad-group-sharing-state-service.ts";
import { SquadGroupEditorInviteResponsesService } from "../../../services/squad-builder/squad-groups/respond-to-squad-group-invite-service.ts";
import { SquadGroupEditorRevocationsService } from "../../../services/squad-builder/squad-groups/revoke-squad-group-editor-service.ts";
import { SquadEditorInviteTargetsService } from "../../../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.ts";
import { SquadGroupEditorInvitesService } from "../../../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.ts";
import type { SquadGroupSharingError } from "../../../services/squad-builder/squad-groups/squad-group-sharing-error.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type ProtocolError = Schema.Schema.Type<
  typeof SquadBuilderSquadGroupSharingError
>;

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
        operation: error.operation,
      });
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

export const SquadBuilderSquadGroupSharingHttpApiHandlers =
  HttpApiBuilder.group(
    AppHttpApi,
    "squadBuilderSquadGroupSharing",
    Effect.fnUntraced(
      function* SquadBuilderSquadGroupSharingHttpApiHandlers(handlers) {
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
          .handle(
            "searchSquadEditorInviteTargets",
            Effect.fn(
              "SquadBuilderSquadGroupSharing.searchSquadEditorInviteTargets"
            )(function* searchSquadEditorInviteTargets({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
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
          .handle(
            "sendSquadGroupEditorInvite",
            Effect.fn(
              "SquadBuilderSquadGroupSharing.sendSquadGroupEditorInvite"
            )(function* sendSquadGroupEditorInvite({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
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
          .handle(
            "respondToSquadGroupInvite",
            Effect.fn(
              "SquadBuilderSquadGroupSharing.respondToSquadGroupInvite"
            )(function* respondToSquadGroupInvite({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
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
          .handle(
            "revokeSquadGroupEditor",
            Effect.fn("SquadBuilderSquadGroupSharing.revokeSquadGroupEditor")(
              function* revokeSquadGroupEditor({ payload, request }) {
                const session = yield* requireSquadBuilderSession();
                return yield* withRequestCorrelation(
                  request,
                  squadGroupEditorRevocationsSvc.revoke({
                    actorUserId: sessionAppUserId(session),
                    invitationId: payload.invitationId,
                  })
                ).pipe(Effect.mapError(mapSquadGroupSharingError));
              }
            )
          )
          .handle(
            "listIncomingSquadGroupInvites",
            Effect.fn(
              "SquadBuilderSquadGroupSharing.listIncomingSquadGroupInvites"
            )(function* listIncomingSquadGroupInvites({ request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                squadGroupSharingStateSvc.listIncomingInvites({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle(
            "listSharedSquadGroups",
            Effect.fn("SquadBuilderSquadGroupSharing.listSharedSquadGroups")(
              function* listSharedSquadGroups({ request }) {
                const session = yield* requireSquadBuilderSession();
                return yield* withRequestCorrelation(
                  request,
                  squadGroupSharingStateSvc.listSharedGroups({
                    actorUserId: sessionAppUserId(session),
                  })
                ).pipe(Effect.mapError(mapSquadGroupSharingError));
              }
            )
          )
          .handle(
            "listSquadGroupEditorGrants",
            Effect.fn(
              "SquadBuilderSquadGroupSharing.listSquadGroupEditorGrants"
            )(function* listSquadGroupEditorGrants({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                squadGroupSharingStateSvc.listEditorGrants({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          )
          .handle(
            "countPendingSquadGroupInvites",
            Effect.fn(
              "SquadBuilderSquadGroupSharing.countPendingSquadGroupInvites"
            )(function* countPendingSquadGroupInvites({ request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                squadGroupSharingStateSvc.countPendingInvites({
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapSquadGroupSharingError));
            })
          );
      }
    )
  );
