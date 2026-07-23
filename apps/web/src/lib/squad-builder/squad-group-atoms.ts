import type {
  AvailableSquadCharacterSchema,
  GlobalSquadGroupSummarySchema,
  SquadGroupDetailCharacterSchema,
  SquadGroupDetailSchema,
  SquadGroupSummarySchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";
import { asSquadGroupId, asSquadId } from "@/lib/squad-builder/branded-ids";

interface SquadGroupIdInput {
  readonly groupId: number;
}

export type AvailableSquadCharacter = AvailableSquadCharacterSchema;
export type GlobalSquadGroupSummary = GlobalSquadGroupSummarySchema;
type SquadGroupDetail = SquadGroupDetailSchema;
export type SquadGroupDetailCharacter = SquadGroupDetailCharacterSchema;
export type SquadGroupSummary = SquadGroupSummarySchema;

interface CreateSquadGroupInput {
  readonly name: string;
}
interface DeleteSquadGroupInput {
  readonly groupId: number;
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
  readonly expectedUpdatedAt: Date;
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly SaveSquadPayloadSquad[];
}
interface SaveSharedSquadGroupCharactersInput {
  readonly expectedUpdatedAt: Date;
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

const ListGlobalSquadGroupsKeySchema = Schema.fromJsonString(
  Schema.Tuple([
    Schema.NullOr(Schema.Finite),
    Schema.NullOr(Schema.Finite),
    Schema.NullOr(Schema.String),
  ])
);

interface RefreshVisibleSquadGroupAtomsOptions {
  readonly actorUserId?: string;
  readonly groupId?: number;
}

const globalSquadGroupsKey = (
  payload: ListGlobalSquadGroupsInput
): ListGlobalSquadGroupsKey =>
  Schema.encodeSync(ListGlobalSquadGroupsKeySchema)([
    payload.maxLevel ?? null,
    payload.minLevel ?? null,
    payload.nameQuery ?? null,
  ]);

const globalSquadGroupsPayloadFromKey = (
  key: ListGlobalSquadGroupsKey
): ListGlobalSquadGroupsInput => {
  const [maxLevel, minLevel, nameQuery] = Schema.decodeUnknownSync(
    ListGlobalSquadGroupsKeySchema
  )(key);
  return {
    maxLevel,
    minLevel,
    nameQuery,
  };
};

const squadGroupIdKey = (groupId: number): string => `${groupId}`;

const disabledSquadGroupDetailAtom = Atom.make<
  AsyncResult.AsyncResult<SquadGroupDetail, never>
>(AsyncResult.initial());
const disabledAvailableSquadCharactersAtom = Atom.make<
  AsyncResult.AsyncResult<readonly AvailableSquadCharacter[], never>
>(AsyncResult.success([]));

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
          payload,
        });
      })
    );
  }
);

export const globalSquadGroupsAtom = (payload: ListGlobalSquadGroupsInput) =>
  globalSquadGroupsByKeyAtom(globalSquadGroupsKey(payload));

const squadGroupDetailByKeyAtom = Atom.family((key: string) => {
  const payload = {
    groupId: Schema.decodeUnknownSync(Schema.FiniteFromString)(key),
  } satisfies SquadGroupIdInput;
  return appHttpApiAtom(
    Effect.gen(function* getSquadGroupDetailEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.getSquadGroupDetail({
        payload: {
          groupId: yield* asSquadGroupId(payload.groupId),
        },
      });
    })
  ).pipe(Atom.setIdleTTL("5 minutes"));
});

export const squadGroupDetailAtom = (payload: SquadGroupIdInput) =>
  payload.groupId > 0
    ? squadGroupDetailByKeyAtom(squadGroupIdKey(payload.groupId))
    : disabledSquadGroupDetailAtom;

const availableSquadCharactersByKeyAtom = Atom.family((key: string) => {
  const payload = {
    groupId: Schema.decodeUnknownSync(Schema.FiniteFromString)(key),
  } satisfies SquadGroupIdInput;
  return appHttpApiAtom(
    Effect.gen(function* listAvailableSquadCharactersEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listAvailableSquadCharacters({
        payload: {
          groupId: yield* asSquadGroupId(payload.groupId),
        },
      });
    })
  ).pipe(Atom.setIdleTTL("5 minutes"));
});

export const availableSquadCharactersAtom = (payload: SquadGroupIdInput) =>
  payload.groupId > 0
    ? availableSquadCharactersByKeyAtom(squadGroupIdKey(payload.groupId))
    : disabledAvailableSquadCharactersAtom;

export const refreshVisibleSquadGroupAtoms = (
  get: Atom.FnContext,
  options: RefreshVisibleSquadGroupAtomsOptions = {}
) => {
  get.refresh(ownedSquadGroupsByActorAtom("default"));

  if (options.groupId !== undefined && options.groupId > 0) {
    const key = squadGroupIdKey(options.groupId);
    get.refresh(squadGroupDetailByKeyAtom(key));
    get.refresh(availableSquadCharactersByKeyAtom(key));
  }
};

export const createSquadGroupAtom = appHttpApiFn(
  Effect.fn("Web.SquadGroup.create")(function* createSquadGroupEffect(
    payload: CreateSquadGroupInput,
    get: Atom.FnContext
  ) {
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

export const deleteSquadGroupAtom = appHttpApiFn(
  Effect.fn("Web.SquadGroup.delete")(function* deleteSquadGroupEffect(
    payload: DeleteSquadGroupInput,
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const result = yield* client.squadBuilderSquadGroup.deleteSquadGroup({
      payload: {
        groupId: yield* asSquadGroupId(payload.groupId),
      },
    });
    get.refresh(ownedSquadGroupsByActorAtom("default"));
    return result;
  })
);

export const saveSquadGroupAtom = appHttpApiFn(
  Effect.fn("Web.SquadGroup.save")(function* saveSquadGroupEffect(
    payload: SaveSquadGroupInput,
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const squads = yield* Effect.forEach((squad: SaveSquadPayloadSquad) => {
      const { squadId, ...squadWithoutId } = squad;
      return squadId === undefined
        ? Effect.succeed(squadWithoutId)
        : asSquadId(squadId).pipe(
            Effect.map((decodedSquadId) => ({
              ...squadWithoutId,
              squadId: decodedSquadId,
            }))
          );
    })(payload.squads);
    const squadGroup = yield* client.squadBuilderSquadGroup.saveSquadGroup({
      payload: {
        expectedUpdatedAt: payload.expectedUpdatedAt,
        groupId: yield* asSquadGroupId(payload.groupId),
        name: payload.name,
        squads,
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
  Effect.fn("Web.SquadGroup.saveSharedCharacters")(
    function* saveSharedSquadGroupCharactersEffect(
      payload: SaveSharedSquadGroupCharactersInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const squads = yield* Effect.forEach(
        (squad: SaveSharedSquadGroupCharactersInput["squads"][number]) =>
          asSquadId(squad.squadId).pipe(
            Effect.map((squadId) => ({ ...squad, squadId }))
          )
      )(payload.squads);
      const squadGroup =
        yield* client.squadBuilderSquadGroup.saveSharedSquadGroupCharacters({
          payload: {
            expectedUpdatedAt: payload.expectedUpdatedAt,
            groupId: yield* asSquadGroupId(payload.groupId),
            squads,
          },
        });
      get.refresh(ownedSquadGroupsByActorAtom("default"));
      get.refresh(squadGroupDetailByKeyAtom(squadGroupIdKey(payload.groupId)));
      get.refresh(
        availableSquadCharactersByKeyAtom(squadGroupIdKey(payload.groupId))
      );
      return squadGroup;
    }
  )
);

export const setSquadGroupVisibilityAtom = appHttpApiFn(
  Effect.fn("Web.SquadGroup.setVisibility")(
    function* setSquadGroupVisibilityEffect(
      payload: SetSquadGroupVisibilityInput,
      get: Atom.FnContext
    ) {
      const client = yield* AppHttpApiClient;
      const visibility =
        yield* client.squadBuilderSquadGroup.setSquadGroupVisibility({
          payload: {
            groupId: yield* asSquadGroupId(payload.groupId),
            visibility: payload.visibility,
          },
        });
      get.refresh(ownedSquadGroupsByActorAtom("default"));
      get.refresh(squadGroupDetailByKeyAtom(squadGroupIdKey(payload.groupId)));
      return visibility;
    }
  )
);
