import type {
  AvailableSquadCharacterSchema,
  GlobalSquadGroupSummarySchema,
  SquadGroupDetailSchema,
  SquadGroupSummarySchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import { Effect } from "effect";
import * as Data from "effect/Data";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import {
  asSquadGroupId,
  asSquadId,
} from "@/features/squad-builder/branded-ids";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

interface SquadGroupIdInput {
  readonly groupId: number;
}

export type AvailableSquadCharacter = AvailableSquadCharacterSchema;
export type GlobalSquadGroupSummary = GlobalSquadGroupSummarySchema;
type SquadGroupDetail = SquadGroupDetailSchema;
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

class ListGlobalSquadGroupsKey extends Data.Class<{
  readonly maxLevel: number | null;
  readonly minLevel: number | null;
  readonly nameQuery: string | null;
}> {}

interface RefreshVisibleSquadGroupAtomsOptions {
  readonly groupId?: number;
}

const globalSquadGroupsKey = (payload: ListGlobalSquadGroupsInput) =>
  new ListGlobalSquadGroupsKey({
    maxLevel: payload.maxLevel ?? null,
    minLevel: payload.minLevel ?? null,
    nameQuery: payload.nameQuery ?? null,
  });

const disabledSquadGroupDetailAtom = Atom.make<
  AsyncResult.AsyncResult<SquadGroupDetail, never>
>(AsyncResult.initial());
const disabledAvailableSquadCharactersAtom = Atom.make<
  AsyncResult.AsyncResult<readonly AvailableSquadCharacter[], never>
>(AsyncResult.success([]));

export const ownedSquadGroupsAtom = appHttpApiAtom(
  Effect.gen(function* listOwnedSquadGroupsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderSquadGroup.listOwnedSquadGroups({
      payload: {},
    });
  })
);

const globalSquadGroupsByKeyAtom = Atom.family(
  (payload: ListGlobalSquadGroupsKey) =>
    appHttpApiAtom(
      Effect.gen(function* listGlobalSquadGroupsEffect() {
        const client = yield* AppHttpApiClient;
        return yield* client.squadBuilderSquadGroup.listGlobalSquadGroups({
          payload,
        });
      })
    )
);

export const globalSquadGroupsAtom = (payload: ListGlobalSquadGroupsInput) =>
  globalSquadGroupsByKeyAtom(globalSquadGroupsKey(payload));

const squadGroupDetailByIdAtom = Atom.family((groupId: number) =>
  appHttpApiAtom(
    Effect.gen(function* getSquadGroupDetailEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.getSquadGroupDetail({
        payload: {
          groupId: yield* asSquadGroupId(groupId),
        },
      });
    })
  ).pipe(Atom.setIdleTTL("5 minutes"))
);

export const squadGroupDetailAtom = (payload: SquadGroupIdInput) =>
  payload.groupId > 0
    ? squadGroupDetailByIdAtom(payload.groupId)
    : disabledSquadGroupDetailAtom;

const availableSquadCharactersByIdAtom = Atom.family((groupId: number) =>
  appHttpApiAtom(
    Effect.gen(function* listAvailableSquadCharactersEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listAvailableSquadCharacters({
        payload: {
          groupId: yield* asSquadGroupId(groupId),
        },
      });
    })
  ).pipe(Atom.setIdleTTL("5 minutes"))
);

export const availableSquadCharactersAtom = (payload: SquadGroupIdInput) =>
  payload.groupId > 0
    ? availableSquadCharactersByIdAtom(payload.groupId)
    : disabledAvailableSquadCharactersAtom;

export const refreshVisibleSquadGroupAtoms = (
  get: Atom.FnContext,
  options: RefreshVisibleSquadGroupAtomsOptions = {}
) => {
  get.refresh(ownedSquadGroupsAtom);

  if (options.groupId !== undefined && options.groupId > 0) {
    get.refresh(squadGroupDetailByIdAtom(options.groupId));
    get.refresh(availableSquadCharactersByIdAtom(options.groupId));
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
    get.refresh(ownedSquadGroupsAtom);
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
    get.refresh(ownedSquadGroupsAtom);
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
    get.refresh(ownedSquadGroupsAtom);
    get.refresh(squadGroupDetailByIdAtom(payload.groupId));
    get.refresh(availableSquadCharactersByIdAtom(payload.groupId));
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
      get.refresh(ownedSquadGroupsAtom);
      get.refresh(squadGroupDetailByIdAtom(payload.groupId));
      get.refresh(availableSquadCharactersByIdAtom(payload.groupId));
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
      get.refresh(ownedSquadGroupsAtom);
      get.refresh(squadGroupDetailByIdAtom(payload.groupId));
      return visibility;
    }
  )
);
