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
import { asSquadGroupId } from "@/lib/squad-builder/branded-ids";

interface SquadGroupIdInput {
  readonly groupId: number;
}

export type AvailableSquadCharacter = typeof AvailableSquadCharacterSchema.Type;
export type GlobalSquadGroupSummary = typeof GlobalSquadGroupSummarySchema.Type;
export type SquadGroupDetail = typeof SquadGroupDetailSchema.Type;
export type SquadGroupDetailCharacter =
  typeof SquadGroupDetailCharacterSchema.Type;
export type SquadGroupSummary = typeof SquadGroupSummarySchema.Type;

interface CreateSquadGroupInput {
  readonly name: string;
}
interface ListGlobalSquadGroupsInput {
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
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly SaveSquadPayloadSquad[];
}
interface SaveSharedSquadGroupCharactersInput {
  readonly groupId: number;
  readonly squads: readonly {
    readonly characters: readonly SaveSquadPayloadCharacter[];
    readonly squadId: number;
  }[];
}
interface SetSquadGroupVisibilityInput {
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
    payload.maxLevel ?? null,
    payload.minLevel ?? null,
    payload.nameQuery ?? null,
  ]);

const globalSquadGroupsPayloadFromKey = (
  key: ListGlobalSquadGroupsKey
): ListGlobalSquadGroupsInput => {
  const [maxLevel, minLevel, nameQuery] = JSON.parse(key) as [
    number | null,
    number | null,
    string | null,
  ];
  return {
    maxLevel,
    minLevel,
    nameQuery,
  };
};

const squadGroupIdKey = (groupId: number): string => `${groupId}`;

const squadGroupIdPayloadFromKey = (key: string): SquadGroupIdInput => ({
  groupId: Number(key),
});

const squadGroupIdKeyMatches = (
  key: string,
  options: RefreshVisibleSquadGroupAtomsOptions
): boolean => options.groupId === undefined || Number(key) === options.groupId;

const ownedSquadGroupsByActorAtom = Atom.family((_actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listOwnedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listOwnedSquadGroups({
        payload: {},
      });
    })
  )
);

export const ownedSquadGroupsAtom = (actorUserId: string) => {
  visibleOwnedSquadGroupActorIds.add(actorUserId);
  return ownedSquadGroupsByActorAtom(actorUserId);
};

const globalSquadGroupsByKeyAtom = Atom.family(
  (key: ListGlobalSquadGroupsKey) => {
    const payload = globalSquadGroupsPayloadFromKey(key);
    return appHttpApiAtom(
      Effect.gen(function* listGlobalSquadGroupsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroup.listGlobalSquadGroups({
          payload: {
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
          groupId: asSquadGroupId(payload.groupId),
        },
      });
    })
  );
});

export const squadGroupDetailAtom = (payload: SquadGroupIdInput) => {
  const key = squadGroupIdKey(payload.groupId);
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
          groupId: asSquadGroupId(payload.groupId),
        },
      });
    })
  );
});

export const availableSquadCharactersAtom = (payload: SquadGroupIdInput) => {
  const key = squadGroupIdKey(payload.groupId);
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
  (payload: CreateSquadGroupInput) =>
    Effect.gen(function* createSquadGroupEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup = yield* client.squadBuilderSquadGroup.createSquadGroup({
        payload: {
          name: payload.name,
        },
      });
      return squadGroup;
    })
);

export const saveSquadGroupAtom = appHttpApiFn((payload: SaveSquadGroupInput) =>
  Effect.gen(function* saveSquadGroupEffect() {
    const client = yield* AppHttpApiClient;
    const squadGroup = yield* client.squadBuilderSquadGroup.saveSquadGroup({
      payload: {
        groupId: asSquadGroupId(payload.groupId),
        name: payload.name,
        squads: payload.squads,
      },
    });
    return squadGroup;
  })
);

export const saveSharedSquadGroupCharactersAtom = appHttpApiFn(
  (payload: SaveSharedSquadGroupCharactersInput) =>
    Effect.gen(function* saveSharedSquadGroupCharactersEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup =
        yield* client.squadBuilderSquadGroup.saveSharedSquadGroupCharacters({
          payload: {
            groupId: asSquadGroupId(payload.groupId),
            squads: payload.squads,
          },
        });
      return squadGroup;
    })
);

export const setSquadGroupVisibilityAtom = appHttpApiFn(
  (payload: SetSquadGroupVisibilityInput) =>
    Effect.gen(function* setSquadGroupVisibilityEffect() {
      const client = yield* AppHttpApiClient;
      const visibility =
        yield* client.squadBuilderSquadGroup.setSquadGroupVisibility({
          payload: {
            groupId: asSquadGroupId(payload.groupId),
            visibility: payload.visibility,
          },
        });
      return visibility;
    })
);
