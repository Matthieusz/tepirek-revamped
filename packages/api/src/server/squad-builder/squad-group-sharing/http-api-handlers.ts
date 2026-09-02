/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { emptySquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../../../protocol/squad-builder/errors.ts";
import { search } from "../../../services/squad-builder/squad-groups/search-squad-editor-invite-targets-service.ts";
import { send } from "../../../services/squad-builder/squad-groups/send-squad-group-editor-invite-service.ts";
import {
  respond,
  revoke,
} from "../../../services/squad-builder/squad-groups/squad-group-sharing-operations.ts";
import {
  countPendingSquadGroupInvites as countPendingSquadGroupInvitesWorkflow,
  listIncomingSquadGroupInvites as listIncomingSquadGroupInvitesWorkflow,
  listSharedSquadGroups as listSharedSquadGroupsWorkflow,
  listSquadGroupEditorGrants as listSquadGroupEditorGrantsWorkflow,
} from "../../../services/squad-builder/squad-groups/squad-group-sharing-queries.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type SearchSquadEditorInviteTargetsError = Effect.Error<
  ReturnType<typeof search>
>;
type SendSquadGroupEditorInviteError = Effect.Error<ReturnType<typeof send>>;
type RespondToSquadGroupInviteError = Effect.Error<ReturnType<typeof respond>>;
type RevokeSquadGroupEditorError = Effect.Error<ReturnType<typeof revoke>>;
type ListIncomingSquadGroupInvitesError = Effect.Error<
  ReturnType<typeof listIncomingSquadGroupInvitesWorkflow>
>;
type ListSharedSquadGroupsError = Effect.Error<
  ReturnType<typeof listSharedSquadGroupsWorkflow>
>;
type ListSquadGroupEditorGrantsError = Effect.Error<
  ReturnType<typeof listSquadGroupEditorGrantsWorkflow>
>;
type CountPendingSquadGroupInvitesError = Effect.Error<
  ReturnType<typeof countPendingSquadGroupInvitesWorkflow>
>;
type SquadGroupSharingHandlerError =
  | SearchSquadEditorInviteTargetsError
  | SendSquadGroupEditorInviteError
  | RespondToSquadGroupInviteError
  | RevokeSquadGroupEditorError
  | ListIncomingSquadGroupInvitesError
  | ListSquadGroupEditorGrantsError;

type SearchSquadEditorInviteTargetsProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderInvalidInput
  | SquadBuilderPersistenceUnavailable;
type SendSquadGroupEditorInviteProtocolError =
  | SearchSquadEditorInviteTargetsProtocolError
  | SquadBuilderConflict;
type RespondToSquadGroupInviteProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderConflict
  | SquadBuilderPersistenceUnavailable;
type ListSquadGroupEditorGrantsProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderPersistenceUnavailable;

function mapSquadGroupSharingError(
  error: ListIncomingSquadGroupInvitesError
): SquadBuilderPersistenceUnavailable;
function mapSquadGroupSharingError(
  error: ListSquadGroupEditorGrantsError
): ListSquadGroupEditorGrantsProtocolError;
function mapSquadGroupSharingError(
  error: SearchSquadEditorInviteTargetsError
): SearchSquadEditorInviteTargetsProtocolError;
function mapSquadGroupSharingError(
  error: RespondToSquadGroupInviteError | RevokeSquadGroupEditorError
): RespondToSquadGroupInviteProtocolError;
function mapSquadGroupSharingError(
  error: SendSquadGroupEditorInviteError
): SendSquadGroupEditorInviteProtocolError;
function mapSquadGroupSharingError(
  error: SquadGroupSharingHandlerError
): SendSquadGroupEditorInviteProtocolError {
  switch (error._tag) {
    case "SquadGroupNotFound":
    case "SquadGroupInvitationNotFound":
    case "SquadEditorInviteTargetNotFound": {
      return new SquadBuilderNotFound({ message: error._tag });
    }
    case "ActorDoesNotOwnSquadGroup":
    case "ActorIsNotSquadGroupInviteRecipient":
    case "SquadEditorInviteTargetNotVerified": {
      return new SquadBuilderForbidden({ message: error._tag });
    }
    case "SquadGroupInvitationTransitionNotAllowed": {
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

const mapSearchSquadEditorInviteTargetsError = (
  error: SearchSquadEditorInviteTargetsError
): SearchSquadEditorInviteTargetsProtocolError =>
  mapSquadGroupSharingError(error);
const mapSendSquadGroupEditorInviteError = (
  error: SendSquadGroupEditorInviteError
): SendSquadGroupEditorInviteProtocolError => mapSquadGroupSharingError(error);
const mapRespondToSquadGroupInviteError = (
  error: RespondToSquadGroupInviteError
): RespondToSquadGroupInviteProtocolError => mapSquadGroupSharingError(error);
const mapRevokeSquadGroupEditorError = (
  error: RevokeSquadGroupEditorError
): RespondToSquadGroupInviteProtocolError => mapSquadGroupSharingError(error);
const mapListIncomingSquadGroupInvitesError = (
  error: ListIncomingSquadGroupInvitesError
): SquadBuilderPersistenceUnavailable => mapSquadGroupSharingError(error);
const mapListSharedSquadGroupsError = (
  error: ListSharedSquadGroupsError
): SquadBuilderPersistenceUnavailable => mapSquadGroupSharingError(error);
const mapListSquadGroupEditorGrantsError = (
  error: ListSquadGroupEditorGrantsError
): ListSquadGroupEditorGrantsProtocolError => mapSquadGroupSharingError(error);
const mapCountPendingSquadGroupInvitesError = (
  error: CountPendingSquadGroupInvitesError
): SquadBuilderPersistenceUnavailable => mapSquadGroupSharingError(error);

export const SquadBuilderSquadGroupSharingHttpApiHandlers =
  HttpApiBuilder.group(
    AppHttpApi,
    "squadBuilderSquadGroupSharing",
    (handlers) =>
      handlers
        .handle(
          "searchSquadEditorInviteTargets",
          Effect.fn(
            "SquadBuilderSquadGroupSharing.searchSquadEditorInviteTargets"
          )(function* searchSquadEditorInviteTargets({ payload, request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              search({
                actorUserId: sessionAppUserId(session),
                groupId: payload.groupId,
                query: payload.query,
              })
            ).pipe(Effect.mapError(mapSearchSquadEditorInviteTargetsError));
          })
        )
        .handle(
          "sendSquadGroupEditorInvite",
          Effect.fn("SquadBuilderSquadGroupSharing.sendSquadGroupEditorInvite")(
            function* sendSquadGroupEditorInvite({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                send({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                  invitedUserId: payload.invitedUserId,
                })
              ).pipe(Effect.mapError(mapSendSquadGroupEditorInviteError));
            }
          )
        )
        .handle(
          "respondToSquadGroupInvite",
          Effect.fn("SquadBuilderSquadGroupSharing.respondToSquadGroupInvite")(
            function* respondToSquadGroupInvite({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                respond({
                  actorUserId: sessionAppUserId(session),
                  invitationId: payload.invitationId,
                  response: payload.response,
                })
              ).pipe(Effect.mapError(mapRespondToSquadGroupInviteError));
            }
          )
        )
        .handle(
          "revokeSquadGroupEditor",
          Effect.fn("SquadBuilderSquadGroupSharing.revokeSquadGroupEditor")(
            function* revokeSquadGroupEditor({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                revoke({
                  actorUserId: sessionAppUserId(session),
                  invitationId: payload.invitationId,
                })
              ).pipe(Effect.mapError(mapRevokeSquadGroupEditorError));
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
              listIncomingSquadGroupInvitesWorkflow({
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(Effect.mapError(mapListIncomingSquadGroupInvitesError));
          })
        )
        .handle(
          "listSharedSquadGroups",
          Effect.fn("SquadBuilderSquadGroupSharing.listSharedSquadGroups")(
            function* listSharedSquadGroups({ request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                listSharedSquadGroupsWorkflow({
                  actorUserId: sessionAppUserId(session),
                  filters: emptySquadGroupListFilters,
                })
              ).pipe(Effect.mapError(mapListSharedSquadGroupsError));
            }
          )
        )
        .handle(
          "listSquadGroupEditorGrants",
          Effect.fn("SquadBuilderSquadGroupSharing.listSquadGroupEditorGrants")(
            function* listSquadGroupEditorGrants({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              return yield* withRequestCorrelation(
                request,
                listSquadGroupEditorGrantsWorkflow({
                  actorUserId: sessionAppUserId(session),
                  groupId: payload.groupId,
                })
              ).pipe(Effect.mapError(mapListSquadGroupEditorGrantsError));
            }
          )
        )
        .handle(
          "countPendingSquadGroupInvites",
          Effect.fn(
            "SquadBuilderSquadGroupSharing.countPendingSquadGroupInvites"
          )(function* countPendingSquadGroupInvites({ request }) {
            const session = yield* requireSquadBuilderSession();
            return yield* withRequestCorrelation(
              request,
              countPendingSquadGroupInvitesWorkflow({
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(Effect.mapError(mapCountPendingSquadGroupInvitesError));
          })
        )
  );
