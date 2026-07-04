import type { ActorPayload } from "@tepirek-revamped/api/modules/squad-builder/schema/common";
import type {
  RespondToSquadGroupInvitePayload,
  RevokeSquadGroupEditorPayload,
  SearchSquadEditorInviteTargetsPayload,
  SendSquadGroupEditorInvitePayload,
  SquadGroupEditorGrantsPayload,
} from "@tepirek-revamped/api/modules/squad-builder/schema/squad-group-sharing";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type ActorInput = typeof ActorPayload.Type;
type RespondToSquadGroupInviteInput =
  typeof RespondToSquadGroupInvitePayload.Type;
type RevokeSquadGroupEditorInput = typeof RevokeSquadGroupEditorPayload.Type;
type SearchSquadEditorInviteTargetsInput =
  typeof SearchSquadEditorInviteTargetsPayload.Type;
type SendSquadGroupEditorInviteInput =
  typeof SendSquadGroupEditorInvitePayload.Type;
type SquadGroupEditorGrantsInput = typeof SquadGroupEditorGrantsPayload.Type;

/** Resource atom for incoming squad-group editor invitations. */
export const incomingSquadGroupInvitesAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listIncomingSquadGroupInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listIncomingSquadGroupInvites(
        {
          payload,
        }
      );
    })
  );

/** Resource atom for squad groups shared with the current actor. */
export const sharedSquadGroupsAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listSharedSquadGroups({
        payload,
      });
    })
  );

/** Resource atom for editor grants on one squad group. */
export const squadGroupEditorGrantsAtom = (
  payload: SquadGroupEditorGrantsInput
) =>
  appHttpApiAtom(
    Effect.gen(function* listSquadGroupEditorGrantsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listSquadGroupEditorGrants(
        {
          payload,
        }
      );
    })
  );

/** Resource atom for pending squad-group invite count. */
export const pendingSquadGroupInviteCountAtom = (payload: ActorInput) =>
  appHttpApiAtom(
    Effect.gen(function* countPendingSquadGroupInvitesEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.countPendingSquadGroupInvites(
        {
          payload,
        }
      );
    })
  );

export const squadEditorInviteTargetsAtom = (
  payload: SearchSquadEditorInviteTargetsInput
) =>
  appHttpApiAtom(
    Effect.gen(function* searchSquadEditorInviteTargetsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.searchSquadEditorInviteTargets(
        { payload }
      );
    })
  );

/** Mutation atom for responding to a squad-group invite. */
export const respondToSquadGroupInviteAtom = appHttpApiFn(
  (payload: RespondToSquadGroupInviteInput) =>
    Effect.gen(function* respondToSquadGroupInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.respondToSquadGroupInvite(
        {
          payload,
        }
      );
    })
);

export const sendSquadGroupEditorInviteAtom = appHttpApiFn(
  (payload: SendSquadGroupEditorInviteInput) =>
    Effect.gen(function* sendSquadGroupEditorInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.sendSquadGroupEditorInvite(
        { payload }
      );
    })
);

export const revokeSquadGroupEditorAtom = appHttpApiFn(
  (payload: RevokeSquadGroupEditorInput) =>
    Effect.gen(function* revokeSquadGroupEditorEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.revokeSquadGroupEditor(
        { payload }
      );
    })
);
