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
import { refreshVisibleSquadGroupAtoms } from "@/lib/squad-builder/squad-group-atoms";

interface ActorInput {
  readonly actorUserId: string;
}
interface RespondToSquadGroupInviteInput {
  readonly actorUserId: string;
  readonly invitationId: number;
  readonly response: "accept" | "decline";
}
interface RevokeSquadGroupEditorInput {
  readonly actorUserId: string;
  readonly invitationId: number;
}
interface SearchSquadEditorInviteTargetsInput {
  readonly actorUserId: string;
  readonly groupId: number;
  readonly query: string;
}
interface SendSquadGroupEditorInviteInput {
  readonly actorUserId: string;
  readonly groupId: number;
  readonly invitedUserId: string;
}
interface SquadGroupEditorGrantsInput {
  readonly actorUserId: string;
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
  payload: SquadGroupEditorGrantsInput
): SquadGroupEditorGrantsKey => `${payload.actorUserId}:${payload.groupId}`;

const squadGroupEditorGrantsPayloadFromKey = (
  key: SquadGroupEditorGrantsKey
): SquadGroupEditorGrantsInput => {
  const [actorUserId = "", groupId = "0"] = key.split(":");
  return { actorUserId, groupId: Number(groupId) };
};

const squadEditorInviteTargetsKey = (
  payload: SearchSquadEditorInviteTargetsInput
): SquadEditorInviteTargetsKey =>
  JSON.stringify([payload.actorUserId, payload.groupId, payload.query]);

const squadEditorInviteTargetsPayloadFromKey = (
  key: SquadEditorInviteTargetsKey
): SearchSquadEditorInviteTargetsInput => {
  const [actorUserId, groupId, query] = JSON.parse(key) as [
    string,
    number,
    string,
  ];
  return { actorUserId, groupId, query };
};

const squadGroupEditorGrantsKeyMatches = (
  key: SquadGroupEditorGrantsKey,
  options: RefreshVisibleSquadGroupSharingAtomsOptions
): boolean => {
  const payload = squadGroupEditorGrantsPayloadFromKey(key);
  return (
    (options.actorUserId === undefined ||
      payload.actorUserId === options.actorUserId) &&
    (options.groupId === undefined || payload.groupId === options.groupId)
  );
};

const squadEditorInviteTargetsKeyMatches = (
  key: SquadEditorInviteTargetsKey,
  options: RefreshVisibleSquadGroupSharingAtomsOptions
): boolean => {
  const payload = squadEditorInviteTargetsPayloadFromKey(key);
  return (
    (options.actorUserId === undefined ||
      payload.actorUserId === options.actorUserId) &&
    (options.groupId === undefined || payload.groupId === options.groupId)
  );
};

/** Resource atom for incoming squad-group editor invitations. */
const incomingSquadGroupInvitesByActorAtom = Atom.family(
  (actorUserId: string) =>
    appHttpApiAtom(
      Effect.gen(function* listIncomingSquadGroupInvitesEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.listIncomingSquadGroupInvites(
          {
            payload: { actorUserId: asAppUserId(actorUserId) },
          }
        );
      })
    )
);

export const incomingSquadGroupInvitesAtom = (payload: ActorInput) => {
  visibleIncomingSquadGroupInviteActorIds.add(payload.actorUserId);
  return incomingSquadGroupInvitesByActorAtom(payload.actorUserId);
};

/** Resource atom for squad groups shared with the current actor. */
const sharedSquadGroupsByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listSharedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroupSharing.listSharedSquadGroups({
        payload: { actorUserId: asAppUserId(actorUserId) },
      });
    })
  )
);

export const sharedSquadGroupsAtom = (payload: ActorInput) => {
  visibleSharedSquadGroupActorIds.add(payload.actorUserId);
  return sharedSquadGroupsByActorAtom(payload.actorUserId);
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
              actorUserId: asAppUserId(payload.actorUserId),
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
  const key = squadGroupEditorGrantsKey(payload);
  visibleSquadGroupEditorGrantKeys.add(key);
  return squadGroupEditorGrantsByKeyAtom(key);
};

/** Resource atom for pending squad-group invite count. */
const pendingSquadGroupInviteCountByActorAtom = Atom.family(
  (actorUserId: string) =>
    appHttpApiAtom(
      Effect.gen(function* countPendingSquadGroupInvitesEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroupSharing.countPendingSquadGroupInvites(
          {
            payload: { actorUserId: asAppUserId(actorUserId) },
          }
        );
      })
    )
);

export const pendingSquadGroupInviteCountAtom = (payload: ActorInput) => {
  visiblePendingSquadGroupInviteCountActorIds.add(payload.actorUserId);
  return pendingSquadGroupInviteCountByActorAtom(payload.actorUserId);
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
              actorUserId: asAppUserId(payload.actorUserId),
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
  (payload: RespondToSquadGroupInviteInput, get) =>
    Effect.gen(function* respondToSquadGroupInviteEffect() {
      const client = yield* AppHttpApiClient;
      const invite =
        yield* client.squadBuilderSquadGroupSharing.respondToSquadGroupInvite({
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
            invitationId: asSquadGroupInvitationId(payload.invitationId),
            response: payload.response,
          },
        });
      refreshVisibleSquadGroupSharingAtoms(get, {
        actorUserId: payload.actorUserId,
      });
      refreshVisibleSquadGroupSharingAtoms(get, {
        actorUserId: invite.ownerUserId,
        groupId: invite.squadGroupId,
      });
      if (payload.response === "accept") {
        refreshVisibleSquadGroupAtoms(get, {
          actorUserId: payload.actorUserId,
          groupId: invite.squadGroupId,
        });
      }
      return invite;
    })
);

export const sendSquadGroupEditorInviteAtom = appHttpApiFn(
  (payload: SendSquadGroupEditorInviteInput, get) =>
    Effect.gen(function* sendSquadGroupEditorInviteEffect() {
      const client = yield* AppHttpApiClient;
      const invite =
        yield* client.squadBuilderSquadGroupSharing.sendSquadGroupEditorInvite({
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
            groupId: asSquadGroupId(payload.groupId),
            invitedUserId: asAppUserId(payload.invitedUserId),
          },
        });
      refreshVisibleSquadGroupSharingAtoms(get, {
        actorUserId: payload.actorUserId,
        groupId: payload.groupId,
      });
      refreshVisibleSquadGroupSharingAtoms(get, {
        actorUserId: payload.invitedUserId,
      });
      return invite;
    })
);

export const revokeSquadGroupEditorAtom = appHttpApiFn(
  (payload: RevokeSquadGroupEditorInput, get) =>
    Effect.gen(function* revokeSquadGroupEditorEffect() {
      const client = yield* AppHttpApiClient;
      const invite =
        yield* client.squadBuilderSquadGroupSharing.revokeSquadGroupEditor({
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
            invitationId: asSquadGroupInvitationId(payload.invitationId),
          },
        });
      refreshVisibleSquadGroupSharingAtoms(get, {
        actorUserId: payload.actorUserId,
        groupId: invite.squadGroupId,
      });
      refreshVisibleSquadGroupSharingAtoms(get, {
        actorUserId: invite.ownerUserId,
        groupId: invite.squadGroupId,
      });
      refreshVisibleSquadGroupSharingAtoms(get, {
        actorUserId: invite.ownerUserId,
      });
      refreshVisibleSquadGroupAtoms(get, {
        actorUserId: invite.ownerUserId,
        groupId: invite.squadGroupId,
      });
      return invite;
    })
);
