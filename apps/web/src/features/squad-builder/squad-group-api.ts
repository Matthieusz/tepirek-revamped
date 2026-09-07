import type {
  AvailableSquadCharacterSchema,
  GlobalSquadGroupSummarySchema,
  SquadGroupSummarySchema,
} from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import { Effect } from "effect";

import {
  asSquadGroupId,
  asSquadId,
} from "@/features/squad-builder/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

export interface ListGlobalSquadGroupsInput {
  readonly maxLevel?: number | null;
  readonly minLevel?: number | null;
  readonly nameQuery?: string | null;
}

export interface SquadGroupIdInput {
  readonly groupId: number;
}

export interface CreateSquadGroupInput {
  readonly name: string;
}

export interface DeleteSquadGroupInput {
  readonly groupId: number;
}

interface SaveSquadPayloadCharacter {
  readonly characterId: number;
  readonly position: number;
}

export interface SaveSquadPayloadSquad {
  readonly characters: readonly SaveSquadPayloadCharacter[];
  readonly clientKey: string;
  readonly name: string;
  readonly position: number;
  readonly squadId?: number;
}

export interface SaveSquadGroupInput {
  readonly expectedUpdatedAt: Date;
  readonly groupId: number;
  readonly name: string;
  readonly squads: readonly SaveSquadPayloadSquad[];
}

export interface SaveSharedSquadGroupCharactersInput {
  readonly expectedUpdatedAt: Date;
  readonly groupId: number;
  readonly squads: readonly {
    readonly characters: readonly SaveSquadPayloadCharacter[];
    readonly squadId: number;
  }[];
}

export interface SetSquadGroupVisibilityInput {
  readonly groupId: number;
  readonly visibility: "private" | "global";
}

export type AvailableSquadCharacter = AvailableSquadCharacterSchema;
export type GlobalSquadGroupSummary = GlobalSquadGroupSummarySchema;
export type SquadGroupSummary = SquadGroupSummarySchema;
export type SquadGroupApiRunner = typeof runAppHttpApi;

export const listOwnedSquadGroups = Effect.fn("Web.SquadGroup.listOwned")(
  function* listOwnedSquadGroupsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderSquadGroup.listOwnedSquadGroups({
      payload: {},
    });
  }
);

export const listGlobalSquadGroups = Effect.fn("Web.SquadGroup.listGlobal")(
  function* listGlobalSquadGroupsEffect(payload: ListGlobalSquadGroupsInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderSquadGroup.listGlobalSquadGroups({
      payload,
    });
  }
);

export const getSquadGroupDetail = Effect.fn("Web.SquadGroup.getDetail")(
  function* getSquadGroupDetailEffect(input: SquadGroupIdInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderSquadGroup.getSquadGroupDetail({
      payload: { groupId: yield* asSquadGroupId(input.groupId) },
    });
  }
);

export const listAvailableSquadCharacters = Effect.fn(
  "Web.SquadGroup.listAvailableCharacters"
)(function* listAvailableSquadCharactersEffect(input: SquadGroupIdInput) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderSquadGroup.listAvailableSquadCharacters({
    payload: { groupId: yield* asSquadGroupId(input.groupId) },
  });
});

export const createSquadGroup = Effect.fn("Web.SquadGroup.create")(
  function* createSquadGroupEffect(payload: CreateSquadGroupInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderSquadGroup.createSquadGroup({ payload });
  }
);

export const deleteSquadGroup = Effect.fn("Web.SquadGroup.delete")(
  function* deleteSquadGroupEffect(input: DeleteSquadGroupInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.squadBuilderSquadGroup.deleteSquadGroup({
      payload: { groupId: yield* asSquadGroupId(input.groupId) },
    });
  }
);

const decodeSquadId = (squadId: number) => asSquadId(squadId);

export const saveSquadGroup = Effect.fn("Web.SquadGroup.save")(
  function* saveSquadGroupEffect(payload: SaveSquadGroupInput) {
    const client = yield* AppHttpApiClient;
    const squads = yield* Effect.forEach((squad: SaveSquadPayloadSquad) => {
      const { squadId, ...squadWithoutId } = squad;
      return squadId === undefined
        ? Effect.succeed(squadWithoutId)
        : decodeSquadId(squadId).pipe(
            Effect.map((decodedSquadId) => ({
              ...squadWithoutId,
              squadId: decodedSquadId,
            }))
          );
    })(payload.squads);
    return yield* client.squadBuilderSquadGroup.saveSquadGroup({
      payload: {
        expectedUpdatedAt: payload.expectedUpdatedAt,
        groupId: yield* asSquadGroupId(payload.groupId),
        name: payload.name,
        squads,
      },
    });
  }
);

export const saveSharedSquadGroupCharacters = Effect.fn(
  "Web.SquadGroup.saveSharedCharacters"
)(function* saveSharedSquadGroupCharactersEffect(
  payload: SaveSharedSquadGroupCharactersInput
) {
  const client = yield* AppHttpApiClient;
  const squads = yield* Effect.forEach(
    (squad: SaveSharedSquadGroupCharactersInput["squads"][number]) =>
      decodeSquadId(squad.squadId).pipe(
        Effect.map((squadId) => ({ ...squad, squadId }))
      )
  )(payload.squads);
  return yield* client.squadBuilderSquadGroup.saveSharedSquadGroupCharacters({
    payload: {
      expectedUpdatedAt: payload.expectedUpdatedAt,
      groupId: yield* asSquadGroupId(payload.groupId),
      squads,
    },
  });
});

export const setSquadGroupVisibility = Effect.fn(
  "Web.SquadGroup.setVisibility"
)(function* setSquadGroupVisibilityEffect(
  payload: SetSquadGroupVisibilityInput
) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderSquadGroup.setSquadGroupVisibility({
    payload: {
      groupId: yield* asSquadGroupId(payload.groupId),
      visibility: payload.visibility,
    },
  });
});
