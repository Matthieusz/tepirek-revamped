import { Atom } from "@effect-atom/atom-react";
import type {
  AvailableSquadCharacterSchema,
  GlobalSquadGroupSummarySchema,
  SquadGroupDetailCharacterSchema,
  SquadGroupDetailSchema,
  SquadGroupSummarySchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import { asAppUserId, asSquadGroupId } from "@/lib/squad-builder/branded-ids";

interface SquadGroupIdInput {
  readonly actorUserId: string;
  readonly groupId: number;
}

export type AvailableSquadCharacter = typeof AvailableSquadCharacterSchema.Type;
export type GlobalSquadGroupSummary = typeof GlobalSquadGroupSummarySchema.Type;
export type SquadGroupDetail = typeof SquadGroupDetailSchema.Type;
export type SquadGroupDetailCharacter =
  typeof SquadGroupDetailCharacterSchema.Type;
export type SquadGroupSummary = typeof SquadGroupSummarySchema.Type;

interface CreateSquadGroupInput {
  readonly actorUserId: string;
  readonly name: string;
}
interface ListGlobalSquadGroupsInput {
  readonly actorUserId: string;
  readonly maxLevel?: number | null;
  readonly minLevel?: number | null;
  readonly nameQuery?: string | null;
}
interface SaveSquadPayloadCharacter {
  readonly characterId: number;
  readonly position: number;
}
interface SaveSquadPayloadSquad {
  readonly characters: readonly SaveSquadPayloadCharacter[];
  readonly clientKey: string;
  readonly name: string;
  readonly position: number;
  readonly squadId?: number;
}
interface SaveSquadGroupInput {
  readonly actorUserId: string;
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly SaveSquadPayloadSquad[];
}
interface SaveSharedSquadGroupCharactersInput {
  readonly actorUserId: string;
  readonly groupId: number;
  readonly squads: readonly {
    readonly characters: readonly SaveSquadPayloadCharacter[];
    readonly squadId: number;
  }[];
}
interface SetSquadGroupVisibilityInput {
  readonly actorUserId: string;
  readonly groupId: number;
  readonly visibility: "private" | "global";
}

type ListGlobalSquadGroupsKey = string;

interface RefreshVisibleSquadGroupAtomsOptions {
  readonly actorUserId?: string;
  readonly groupId?: number;
}

const visibleOwnedSquadGroupActorIds = new Set<string>();
const visibleGlobalSquadGroupKeys = new Set<ListGlobalSquadGroupsKey>();
const visibleSquadGroupDetailKeys = new Set<string>();
const visibleAvailableSquadCharacterKeys = new Set<string>();

const globalSquadGroupsKey = (
  payload: ListGlobalSquadGroupsInput
): ListGlobalSquadGroupsKey =>
  JSON.stringify([
    payload.actorUserId,
    payload.maxLevel ?? null,
    payload.minLevel ?? null,
    payload.nameQuery ?? null,
  ]);

const globalSquadGroupsPayloadFromKey = (
  key: ListGlobalSquadGroupsKey
): ListGlobalSquadGroupsInput => {
  const [actorUserId, maxLevel, minLevel, nameQuery] = JSON.parse(key) as [
    string,
    number | null,
    number | null,
    string | null,
  ];
  return {
    actorUserId,
    maxLevel,
    minLevel,
    nameQuery,
  };
};

const squadGroupIdKey = (payload: SquadGroupIdInput): string =>
  `${payload.actorUserId}:${payload.groupId}`;

const squadGroupIdPayloadFromKey = (key: string): SquadGroupIdInput => {
  const [actorUserId = "", groupId = "0"] = key.split(":");
  return { actorUserId, groupId: Number(groupId) };
};

const groupPayloadFromMutation = (payload: {
  readonly actorUserId: string;
  readonly groupId: number;
}) => ({
  actorUserId: payload.actorUserId,
  groupId: payload.groupId,
});

const squadGroupIdKeyMatches = (
  key: string,
  options: RefreshVisibleSquadGroupAtomsOptions
): boolean => {
  const payload = squadGroupIdPayloadFromKey(key);
  return (
    (options.actorUserId === undefined ||
      payload.actorUserId === options.actorUserId) &&
    (options.groupId === undefined || payload.groupId === options.groupId)
  );
};

const ownedSquadGroupsByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listOwnedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listOwnedSquadGroups({
        payload: { actorUserId: asAppUserId(actorUserId) },
      });
    })
  )
);

export const ownedSquadGroupsAtom = (payload: {
  readonly actorUserId: string;
}) => {
  visibleOwnedSquadGroupActorIds.add(payload.actorUserId);
  return ownedSquadGroupsByActorAtom(payload.actorUserId);
};

const globalSquadGroupsByKeyAtom = Atom.family(
  (key: ListGlobalSquadGroupsKey) => {
    const payload = globalSquadGroupsPayloadFromKey(key);
    return appHttpApiAtom(
      Effect.gen(function* listGlobalSquadGroupsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroup.listGlobalSquadGroups({
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
            maxLevel: payload.maxLevel,
            minLevel: payload.minLevel,
            nameQuery: payload.nameQuery,
          },
        });
      })
    );
  }
);

export const globalSquadGroupsAtom = (payload: ListGlobalSquadGroupsInput) => {
  const key = globalSquadGroupsKey(payload);
  visibleGlobalSquadGroupKeys.add(key);
  return globalSquadGroupsByKeyAtom(key);
};

const squadGroupDetailByKeyAtom = Atom.family((key: string) => {
  const payload = squadGroupIdPayloadFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getSquadGroupDetailEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.getSquadGroupDetail({
        payload: {
          actorUserId: asAppUserId(payload.actorUserId),
          groupId: asSquadGroupId(payload.groupId),
        },
      });
    })
  );
});

export const squadGroupDetailAtom = (payload: SquadGroupIdInput) => {
  const key = squadGroupIdKey(payload);
  visibleSquadGroupDetailKeys.add(key);
  return squadGroupDetailByKeyAtom(key);
};

const availableSquadCharactersByKeyAtom = Atom.family((key: string) => {
  const payload = squadGroupIdPayloadFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* listAvailableSquadCharactersEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listAvailableSquadCharacters({
        payload: {
          actorUserId: asAppUserId(payload.actorUserId),
          groupId: asSquadGroupId(payload.groupId),
        },
      });
    })
  );
});

export const availableSquadCharactersAtom = (payload: SquadGroupIdInput) => {
  const key = squadGroupIdKey(payload);
  visibleAvailableSquadCharacterKeys.add(key);
  return availableSquadCharactersByKeyAtom(key);
};

export const refreshVisibleSquadGroupAtoms = (
  get: Atom.FnContext,
  options: RefreshVisibleSquadGroupAtomsOptions = {}
) => {
  for (const actorUserId of visibleOwnedSquadGroupActorIds) {
    if (
      options.actorUserId === undefined ||
      actorUserId === options.actorUserId
    ) {
      get.refresh(ownedSquadGroupsByActorAtom(actorUserId));
    }
  }

  for (const key of visibleGlobalSquadGroupKeys) {
    get.refresh(globalSquadGroupsByKeyAtom(key));
  }

  for (const key of visibleSquadGroupDetailKeys) {
    if (squadGroupIdKeyMatches(key, options)) {
      get.refresh(squadGroupDetailByKeyAtom(key));
    }
  }

  for (const key of visibleAvailableSquadCharacterKeys) {
    if (squadGroupIdKeyMatches(key, options)) {
      get.refresh(availableSquadCharactersByKeyAtom(key));
    }
  }
};

export const createSquadGroupAtom = appHttpApiFn(
  (payload: CreateSquadGroupInput, get) =>
    Effect.gen(function* createSquadGroupEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup = yield* client.squadBuilderSquadGroup.createSquadGroup({
        payload: {
          actorUserId: asAppUserId(payload.actorUserId),
          name: payload.name,
        },
      });
      refreshVisibleSquadGroupAtoms(get, { actorUserId: payload.actorUserId });
      return squadGroup;
    })
);

export const saveSquadGroupAtom = appHttpApiFn(
  (payload: SaveSquadGroupInput, get) =>
    Effect.gen(function* saveSquadGroupEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup = yield* client.squadBuilderSquadGroup.saveSquadGroup({
        payload: {
          actorUserId: asAppUserId(payload.actorUserId),
          groupId: asSquadGroupId(payload.groupId),
          name: payload.name,
          squads: payload.squads,
        },
      });
      const groupPayload = groupPayloadFromMutation(payload);
      refreshVisibleSquadGroupAtoms(get, groupPayload);
      return squadGroup;
    })
);

export const saveSharedSquadGroupCharactersAtom = appHttpApiFn(
  (payload: SaveSharedSquadGroupCharactersInput, get) =>
    Effect.gen(function* saveSharedSquadGroupCharactersEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup =
        yield* client.squadBuilderSquadGroup.saveSharedSquadGroupCharacters({
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
            groupId: asSquadGroupId(payload.groupId),
            squads: payload.squads,
          },
        });
      const groupPayload = groupPayloadFromMutation(payload);
      refreshVisibleSquadGroupAtoms(get, groupPayload);
      return squadGroup;
    })
);

export const setSquadGroupVisibilityAtom = appHttpApiFn(
  (payload: SetSquadGroupVisibilityInput, get) =>
    Effect.gen(function* setSquadGroupVisibilityEffect() {
      const client = yield* AppHttpApiClient;
      const visibility =
        yield* client.squadBuilderSquadGroup.setSquadGroupVisibility({
          payload: {
            actorUserId: asAppUserId(payload.actorUserId),
            groupId: asSquadGroupId(payload.groupId),
            visibility: payload.visibility,
          },
        });
      const groupPayload = groupPayloadFromMutation(payload);
      refreshVisibleSquadGroupAtoms(get, groupPayload);
      return visibility;
    })
);
