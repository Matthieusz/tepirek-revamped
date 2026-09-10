import type {
  SquadEditorInviteTargetSchema,
  SquadGroupEditorGrantSummarySchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-group-sharing/squad-group-sharing-schema";
import { Effect } from "effect";

import {
  asSquadGroupId,
  asSquadGroupInvitationId,
} from "@/features/squad-builder/branded-ids";
import { asAppUserId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

export interface SearchSquadEditorInviteTargetsInput {
  readonly groupId: number;
  readonly query: string;
}

export interface SendSquadGroupEditorInviteInput {
  readonly groupId: number;
  readonly invitedUserId: string;
}

export interface RespondToSquadGroupInviteInput {
  readonly invitationId: number;
  readonly response: "accept" | "decline";
}

export interface RevokeSquadGroupEditorInput {
  readonly invitationId: number;
}

/** An editor grant belonging to a squad group. */
export type SquadGroupEditorGrant = SquadGroupEditorGrantSummarySchema;

/** A verified user who can receive a squad-group editor invitation. */
export type SquadEditorInviteTarget = SquadEditorInviteTargetSchema;

/** Runs a squad-group sharing API effect through the application HTTP client. */
export type SquadGroupSharingApiRunner = typeof runAppHttpApi;

/** Lists pending squad-group invitations for the authenticated user. */
export const listIncomingSquadGroupInvites = Effect.fn(
  "Web.SquadGroupSharing.listIncomingInvites"
)(function* listIncomingSquadGroupInvitesEffect() {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderSquadGroupSharing.listIncomingSquadGroupInvites(
    { payload: {} }
  );
});

/** Lists squad groups shared with the authenticated user. */
export const listSharedSquadGroups = Effect.fn(
  "Web.SquadGroupSharing.listSharedGroups"
)(function* listSharedSquadGroupsEffect() {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderSquadGroupSharing.listSharedSquadGroups({
    payload: {},
  });
});

/** Lists editor grants for one squad group. */
export const listSquadGroupEditorGrants = Effect.fn(
  "Web.SquadGroupSharing.listEditorGrants"
)(function* listSquadGroupEditorGrantsEffect(groupId: number) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderSquadGroupSharing.listSquadGroupEditorGrants(
    {
      payload: { groupId: yield* asSquadGroupId(groupId) },
    }
  );
});

/** Searches verified users who can receive an editor invitation. */
export const searchSquadEditorInviteTargets = Effect.fn(
  "Web.SquadGroupSharing.searchInviteTargets"
)(function* searchSquadEditorInviteTargetsEffect(
  input: SearchSquadEditorInviteTargetsInput
) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderSquadGroupSharing.searchSquadEditorInviteTargets(
    {
      payload: {
        groupId: yield* asSquadGroupId(input.groupId),
        query: input.query,
      },
    }
  );
});

/** Sends an editor invitation for a squad group. */
export const sendSquadGroupEditorInvite = Effect.fn(
  "Web.SquadGroupSharing.sendEditorInvite"
)(function* sendSquadGroupEditorInviteEffect(
  input: SendSquadGroupEditorInviteInput
) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderSquadGroupSharing.sendSquadGroupEditorInvite(
    {
      payload: {
        groupId: yield* asSquadGroupId(input.groupId),
        invitedUserId: yield* asAppUserId(input.invitedUserId),
      },
    }
  );
});

/** Accepts or declines one incoming squad-group editor invitation. */
export const respondToSquadGroupInvite = Effect.fn(
  "Web.SquadGroupSharing.respondToInvite"
)(function* respondToSquadGroupInviteEffect(
  input: RespondToSquadGroupInviteInput
) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderSquadGroupSharing.respondToSquadGroupInvite({
    payload: {
      invitationId: yield* asSquadGroupInvitationId(input.invitationId),
      response: input.response,
    },
  });
});

/** Revokes an editor invitation or grant for a squad group. */
export const revokeSquadGroupEditor = Effect.fn(
  "Web.SquadGroupSharing.revokeEditor"
)(function* revokeSquadGroupEditorEffect(input: RevokeSquadGroupEditorInput) {
  const client = yield* AppHttpApiClient;

  return yield* client.squadBuilderSquadGroupSharing.revokeSquadGroupEditor({
    payload: {
      invitationId: yield* asSquadGroupInvitationId(input.invitationId),
    },
  });
});
