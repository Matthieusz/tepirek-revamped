import * as Effect from "effect/Effect";
import type { Effect as EffectType } from "effect/Effect";
import * as Layer from "effect/Layer";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.js";
import type { AppUserId } from "./app-user-id.js";
import type { SquadGroupId } from "./squad-group-id.js";
import type { SquadGroupInvitationId } from "./squad-group-invitation-id.js";
import {
  layer as squadGroupSharingStateLayer,
  use as squadGroupSharingState,
} from "./squad-groups/list-squad-group-sharing-state-service.js";
import {
  layer as squadGroupEditorInviteResponsesLayer,
  use as squadGroupEditorInviteResponses,
} from "./squad-groups/respond-to-squad-group-invite-service.js";
import {
  layer as squadGroupEditorRevocationsLayer,
  use as squadGroupEditorRevocations,
} from "./squad-groups/revoke-squad-group-editor-service.js";
import {
  layer as squadEditorInviteTargetsLayer,
  use as squadEditorInviteTargets,
} from "./squad-groups/search-squad-editor-invite-targets-service.js";
import {
  layer as squadGroupEditorInvitesLayer,
  use as squadGroupEditorInvites,
} from "./squad-groups/send-squad-group-editor-invite-service.js";

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
  effect: EffectType<A, E, R>
): EffectType<A, E, R> => {
  const requestId = request.headers["x-request-id"];

  if (requestId === undefined || requestId.length === 0) {
    return effect;
  }

  return effect.pipe(
    Effect.tap(() => Effect.annotateCurrentSpan("request.id", requestId))
  );
};

const squadGroupSharingHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderSquadGroupSharing",
  (handlers) =>
    handlers
      .handle("searchSquadEditorInviteTargets", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadEditorInviteTargets.search({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
            query: payload.query,
          })
        )
      )
      .handle("sendSquadGroupEditorInvite", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupEditorInvites.send({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
            invitedUserId: toAppUserId(payload.invitedUserId),
          })
        )
      )
      .handle("respondToSquadGroupInvite", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupEditorInviteResponses.respond({
            actorUserId: toAppUserId(payload.actorUserId),
            invitationId: toSquadGroupInvitationId(payload.invitationId),
            response: payload.response,
          })
        )
      )
      .handle("revokeSquadGroupEditor", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupEditorRevocations.revoke({
            actorUserId: toAppUserId(payload.actorUserId),
            invitationId: toSquadGroupInvitationId(payload.invitationId),
          })
        )
      )
      .handle("listIncomingSquadGroupInvites", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.listIncomingInvites({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listSharedSquadGroups", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.listSharedGroups({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
      .handle("listSquadGroupEditorGrants", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.listEditorGrants({
            actorUserId: toAppUserId(payload.actorUserId),
            groupId: toSquadGroupId(payload.groupId),
          })
        )
      )
      .handle("countPendingSquadGroupInvites", ({ payload, request }) =>
        withRequestCorrelation(
          request,
          squadGroupSharingState.countPendingInvites({
            actorUserId: toAppUserId(payload.actorUserId),
          })
        )
      )
);

export const SquadBuilderHttpApiHandlers = Layer.mergeAll(
  squadGroupSharingHandlers
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
