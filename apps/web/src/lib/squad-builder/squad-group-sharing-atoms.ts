import { Atom } from "@effect-atom/atom-react";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import {
  asAppUserId,
  asSquadGroupId,
  asSquadGroupInvitationId,
} from "@/lib/squad-builder/branded-ids";

interface RespondToSquadGroupInviteInput {
  readonly invitationId: number;
  readonly response: "accept" | "decline";
}
interface RevokeSquadGroupEditorInput {
  readonly invitationId: number;
}
interface SearchSquadEditorInviteTargetsInput {
  readonly groupId: number;
  readonly query: string;
}
interface SendSquadGroupEditorInviteInput {
  readonly groupId: number;
  readonly invitedUserId: string;
}
interface SquadGroupEditorGrantsInput {
  readonly groupId: number;
}

type SquadGroupEditorGrantsKey = string;
type SquadEditorInviteTargetsKey = string;

interface RefreshVisibleSquadGroupSharingAtomsOptions {
  readonly actorUserId?: string;
  readonly groupId?: number;
}

const visibleIncomingSquadGroupInviteActorIds = new Set<string>();
const visibleSharedSquadGroupActorIds = new Set<string>();
const visibleSquadGroupEditorGrantKeys = new Set<SquadGroupEditorGrantsKey>();
const visiblePendingSquadGroupInviteCountActorIds = new Set<string>();
const visibleSquadEditorInviteTargetKeys =
  new Set<SquadEditorInviteTargetsKey>();

const squadGroupEditorGrantsKey = (
  groupId: number
): SquadGroupEditorGrantsKey => `${groupId}`;

const squadGroupEditorGrantsPayloadFromKey = (
  key: SquadGroupEditorGrantsKey
): SquadGroupEditorGrantsInput => ({
  groupId: Number(key),
});

const squadEditorInviteTargetsKey = (
  payload: SearchSquadEditorInviteTargetsInput
): SquadEditorInviteTargetsKey =>
  JSON.stringify([payload.groupId, payload.query]);

const squadEditorInviteTargetsPayloadFromKey = (
  key: SquadEditorInviteTargetsKey
): SearchSquadEditorInviteTargetsInput => {
  const [groupId, query] = JSON.parse(key) as [number, string];
  return { groupId, query };
};

const squadGroupEditorGrantsKeyMatches = (
  key: SquadGroupEditorGrantsKey,
  options: RefreshVisibleSquadGroupSharingAtomsOptions
): boolean => options.groupId === undefined || Number(key) === options.groupId;

const squadEditorInviteTargetsKeyMatches = (
  _key: SquadEditorInviteTargetsKey,
  _options: RefreshVisibleSquadGroupSharingAtomsOptions
): boolean => true;

/** Resource atom for incoming squad-group editor invitations. */
const incomingSquadGroupInvitesByActorAtom = Atom.family(
  (_actorUserId: string) =>
    appHttpApiAtom(
      Effect.gen(function* listIncomingSquadGroupInvitesEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.listIncomingSquadGroupInvites(
          {
            payload: {},
          }
        );
      })
    )
);

export const incomingSquadGroupInvitesAtom = (actorUserId: string) => {
  visibleIncomingSquadGroupInviteActorIds.add(actorUserId);
  return incomingSquadGroupInvitesByActorAtom(actorUserId);
};

/** Resource atom for squad groups shared with the current actor. */
const sharedSquadGroupsByActorAtom = Atom.family((_actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listSharedSquadGroups({
        payload: {},
      });
    })
  )
);

export const sharedSquadGroupsAtom = (actorUserId: string) => {
  visibleSharedSquadGroupActorIds.add(actorUserId);
  return sharedSquadGroupsByActorAtom(actorUserId);
};

/** Resource atom for editor grants on one squad group. */
const squadGroupEditorGrantsByKeyAtom = Atom.family(
  (key: SquadGroupEditorGrantsKey) => {
    const payload = squadGroupEditorGrantsPayloadFromKey(key);
    return appHttpApiAtom(
      Effect.gen(function* listSquadGroupEditorGrantsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.listSquadGroupEditorGrants(
          {
            payload: {
              groupId: asSquadGroupId(payload.groupId),
            },
          }
        );
      })
    );
  }
);

export const squadGroupEditorGrantsAtom = (
  payload: SquadGroupEditorGrantsInput
) => {
  const key = squadGroupEditorGrantsKey(payload.groupId);
  visibleSquadGroupEditorGrantKeys.add(key);
  return squadGroupEditorGrantsByKeyAtom(key);
};

/** Resource atom for pending squad-group invite count. */
const pendingSquadGroupInviteCountByActorAtom = Atom.family(
  (_actorUserId: string) =>
    appHttpApiAtom(
      Effect.gen(function* countPendingSquadGroupInvitesEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.countPendingSquadGroupInvites(
          {
            payload: {},
          }
        );
      })
    )
);

export const pendingSquadGroupInviteCountAtom = (actorUserId: string) => {
  visiblePendingSquadGroupInviteCountActorIds.add(actorUserId);
  return pendingSquadGroupInviteCountByActorAtom(actorUserId);
};

const squadEditorInviteTargetsByKeyAtom = Atom.family(
  (key: SquadEditorInviteTargetsKey) => {
    const payload = squadEditorInviteTargetsPayloadFromKey(key);
    return appHttpApiAtom(
      Effect.gen(function* searchSquadEditorInviteTargetsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.searchSquadEditorInviteTargets(
          {
            payload: {
              groupId: asSquadGroupId(payload.groupId),
              query: payload.query,
            },
          }
        );
      })
    );
  }
);

export const squadEditorInviteTargetsAtom = (
  payload: SearchSquadEditorInviteTargetsInput
) => {
  const key = squadEditorInviteTargetsKey(payload);
  visibleSquadEditorInviteTargetKeys.add(key);
  return squadEditorInviteTargetsByKeyAtom(key);
};

export const refreshVisibleSquadGroupSharingAtoms = (
  get: Atom.FnContext,
  options: RefreshVisibleSquadGroupSharingAtomsOptions = {}
) => {
  for (const actorUserId of visibleIncomingSquadGroupInviteActorIds) {
    if (
      options.actorUserId === undefined ||
      actorUserId === options.actorUserId
    ) {
      get.refresh(incomingSquadGroupInvitesByActorAtom(actorUserId));
    }
  }

  for (const actorUserId of visibleSharedSquadGroupActorIds) {
    if (
      options.actorUserId === undefined ||
      actorUserId === options.actorUserId
    ) {
      get.refresh(sharedSquadGroupsByActorAtom(actorUserId));
    }
  }

  for (const key of visibleSquadGroupEditorGrantKeys) {
    if (squadGroupEditorGrantsKeyMatches(key, options)) {
      get.refresh(squadGroupEditorGrantsByKeyAtom(key));
    }
  }

  for (const actorUserId of visiblePendingSquadGroupInviteCountActorIds) {
    if (
      options.actorUserId === undefined ||
      actorUserId === options.actorUserId
    ) {
      get.refresh(pendingSquadGroupInviteCountByActorAtom(actorUserId));
    }
  }

  for (const key of visibleSquadEditorInviteTargetKeys) {
    if (squadEditorInviteTargetsKeyMatches(key, options)) {
      get.refresh(squadEditorInviteTargetsByKeyAtom(key));
    }
  }
};

/** Mutation atom for responding to a squad-group invite. */
export const respondToSquadGroupInviteAtom = appHttpApiFn(
  (payload: RespondToSquadGroupInviteInput) =>
    Effect.gen(function* respondToSquadGroupInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.respondToSquadGroupInvite(
        {
          payload: {
            invitationId: asSquadGroupInvitationId(payload.invitationId),
            response: payload.response,
          },
        }
      );
    })
);

export const sendSquadGroupEditorInviteAtom = appHttpApiFn(
  (payload: SendSquadGroupEditorInviteInput) =>
    Effect.gen(function* sendSquadGroupEditorInviteEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.sendSquadGroupEditorInvite(
        {
          payload: {
            groupId: asSquadGroupId(payload.groupId),
            invitedUserId: asAppUserId(payload.invitedUserId),
          },
        }
      );
    })
);

export const revokeSquadGroupEditorAtom = appHttpApiFn(
  (payload: RevokeSquadGroupEditorInput) =>
    Effect.gen(function* revokeSquadGroupEditorEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.revokeSquadGroupEditor(
        {
          payload: {
            invitationId: asSquadGroupInvitationId(payload.invitationId),
          },
        }
      );
    })
);
