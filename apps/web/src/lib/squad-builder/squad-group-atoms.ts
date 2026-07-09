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

export const ownedSquadGroupsAtom = ownedSquadGroupsByActorAtom("default");

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
    ).pipe(Atom.setIdleTTL("5 minutes"));
  }
);

export const globalSquadGroupsAtom = (payload: ListGlobalSquadGroupsInput) =>
  globalSquadGroupsByKeyAtom(globalSquadGroupsKey(payload));

const squadGroupDetailByKeyAtom = Atom.family((key: string) => {
  const payload = { groupId: Number(key) } as SquadGroupIdInput;
  return appHttpApiAtom(
    Effect.gen(function* getSquadGroupDetailEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.getSquadGroupDetail({
        payload: {
          groupId: asSquadGroupId(payload.groupId),
        },
      });
    })
  ).pipe(Atom.setIdleTTL("5 minutes"));
});

export const squadGroupDetailAtom = (payload: SquadGroupIdInput) =>
  squadGroupDetailByKeyAtom(squadGroupIdKey(payload.groupId));

const availableSquadCharactersByKeyAtom = Atom.family((key: string) => {
  const payload = { groupId: Number(key) } as SquadGroupIdInput;
  return appHttpApiAtom(
    Effect.gen(function* listAvailableSquadCharactersEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listAvailableSquadCharacters({
        payload: {
          groupId: asSquadGroupId(payload.groupId),
        },
      });
    })
  ).pipe(Atom.setIdleTTL("5 minutes"));
});

export const availableSquadCharactersAtom = (payload: SquadGroupIdInput) =>
  availableSquadCharactersByKeyAtom(squadGroupIdKey(payload.groupId));

export const refreshVisibleSquadGroupAtoms = (
  get: Atom.FnContext,
  options: RefreshVisibleSquadGroupAtomsOptions = {}
) => {
  get.refresh(ownedSquadGroupsByActorAtom("default"));

  if (options.groupId !== undefined) {
    const key = squadGroupIdKey(options.groupId);
    get.refresh(squadGroupDetailByKeyAtom(key));
    get.refresh(availableSquadCharactersByKeyAtom(key));
  }
};

export const createSquadGroupAtom = appHttpApiFn(
  (payload: CreateSquadGroupInput, get) =>
    Effect.gen(function* createSquadGroupEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup = yield* client.squadBuilderSquadGroup.createSquadGroup({
        payload: {
          name: payload.name,
        },
      });
      get.refresh(ownedSquadGroupsByActorAtom("default"));
      return squadGroup;
    })
);

export const saveSquadGroupAtom = appHttpApiFn(
  (payload: SaveSquadGroupInput, get) =>
    Effect.gen(function* saveSquadGroupEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup = yield* client.squadBuilderSquadGroup.saveSquadGroup({
        payload: {
          groupId: asSquadGroupId(payload.groupId),
          name: payload.name,
          squads: payload.squads,
        },
      });
      get.refresh(ownedSquadGroupsByActorAtom("default"));
      get.refresh(squadGroupDetailByKeyAtom(squadGroupIdKey(payload.groupId)));
      get.refresh(
        availableSquadCharactersByKeyAtom(squadGroupIdKey(payload.groupId))
      );
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
            groupId: asSquadGroupId(payload.groupId),
            squads: payload.squads,
          },
        });
      get.refresh(ownedSquadGroupsByActorAtom("default"));
      get.refresh(squadGroupDetailByKeyAtom(squadGroupIdKey(payload.groupId)));
      get.refresh(
        availableSquadCharactersByKeyAtom(squadGroupIdKey(payload.groupId))
      );
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
            groupId: asSquadGroupId(payload.groupId),
            visibility: payload.visibility,
          },
        });
      get.refresh(ownedSquadGroupsByActorAtom("default"));
      get.refresh(squadGroupDetailByKeyAtom(squadGroupIdKey(payload.groupId)));
      return visibility;
    })
);
