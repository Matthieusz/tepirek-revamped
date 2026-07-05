import { Atom } from "@effect-atom/atom-react";
import type {
  AvailableSquadCharacterSchema,
  CreateSquadGroupPayload,
  GlobalSquadGroupSummarySchema,
  ListGlobalSquadGroupsPayload,
  SaveSharedSquadGroupCharactersPayload,
  SaveSquadGroupPayload,
  SetSquadGroupVisibilityPayload,
  SquadGroupDetailCharacterSchema,
  SquadGroupDetailSchema,
  SquadGroupSummarySchema,
} from "@tepirek-revamped/api/modules/squad-builder/schema/squad-groups";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

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

type CreateSquadGroupInput = typeof CreateSquadGroupPayload.Type;
type ListGlobalSquadGroupsInput = typeof ListGlobalSquadGroupsPayload.Type;
type SaveSquadGroupInput = typeof SaveSquadGroupPayload.Type;
type SaveSharedSquadGroupCharactersInput =
  typeof SaveSharedSquadGroupCharactersPayload.Type;
type SetSquadGroupVisibilityInput = typeof SetSquadGroupVisibilityPayload.Type;

const squadGroupIdKey = (payload: SquadGroupIdInput): string =>
  `${payload.actorUserId}:${payload.groupId}`;

const squadGroupIdPayloadFromKey = (key: string): SquadGroupIdInput => {
  const [actorUserId = "", groupId = "0"] = key.split(":");
  return { actorUserId, groupId: Number(groupId) };
};

const groupPayloadFromMutation = (payload: SquadGroupIdInput) => ({
  actorUserId: payload.actorUserId,
  groupId: payload.groupId,
});

const ownedSquadGroupsByActorAtom = Atom.family((actorUserId: string) =>
  appHttpApiAtom(
    Effect.gen(function* listOwnedSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listOwnedSquadGroups({
        payload: { actorUserId },
      });
    })
  )
);

export const ownedSquadGroupsAtom = (payload: {
  readonly actorUserId: string;
}) => ownedSquadGroupsByActorAtom(payload.actorUserId);

export const createSquadGroupAtom = appHttpApiFn(
  (payload: CreateSquadGroupInput, get) =>
    Effect.gen(function* createSquadGroupEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup = yield* client.squadBuilderSquadGroup.createSquadGroup({
        payload,
      });
      get.refresh(ownedSquadGroupsAtom({ actorUserId: payload.actorUserId }));
      return squadGroup;
    })
);

export const globalSquadGroupsAtom = (payload: ListGlobalSquadGroupsInput) =>
  appHttpApiAtom(
    Effect.gen(function* listGlobalSquadGroupsEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listGlobalSquadGroups({
        payload,
      });
    })
  );

const squadGroupDetailByKeyAtom = Atom.family((key: string) => {
  const payload = squadGroupIdPayloadFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* getSquadGroupDetailEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.getSquadGroupDetail({
        payload,
      });
    })
  );
});

export const squadGroupDetailAtom = (payload: SquadGroupIdInput) =>
  squadGroupDetailByKeyAtom(squadGroupIdKey(payload));

const availableSquadCharactersByKeyAtom = Atom.family((key: string) => {
  const payload = squadGroupIdPayloadFromKey(key);
  return appHttpApiAtom(
    Effect.gen(function* listAvailableSquadCharactersEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.squadBuilderSquadGroup.listAvailableSquadCharacters({
        payload,
      });
    })
  );
});

export const availableSquadCharactersAtom = (payload: SquadGroupIdInput) =>
  availableSquadCharactersByKeyAtom(squadGroupIdKey(payload));

export const saveSquadGroupAtom = appHttpApiFn(
  (payload: SaveSquadGroupInput, get) =>
    Effect.gen(function* saveSquadGroupEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup = yield* client.squadBuilderSquadGroup.saveSquadGroup({
        payload,
      });
      const groupPayload = groupPayloadFromMutation(payload);
      get.refresh(squadGroupDetailAtom(groupPayload));
      get.refresh(availableSquadCharactersAtom(groupPayload));
      get.refresh(ownedSquadGroupsAtom({ actorUserId: payload.actorUserId }));
      return squadGroup;
    })
);

export const saveSharedSquadGroupCharactersAtom = appHttpApiFn(
  (payload: SaveSharedSquadGroupCharactersInput, get) =>
    Effect.gen(function* saveSharedSquadGroupCharactersEffect() {
      const client = yield* AppHttpApiClient;
      const squadGroup =
        yield* client.squadBuilderSquadGroup.saveSharedSquadGroupCharacters({
          payload,
        });
      const groupPayload = groupPayloadFromMutation(payload);
      get.refresh(squadGroupDetailAtom(groupPayload));
      get.refresh(availableSquadCharactersAtom(groupPayload));
      return squadGroup;
    })
);

export const setSquadGroupVisibilityAtom = appHttpApiFn(
  (payload: SetSquadGroupVisibilityInput, get) =>
    Effect.gen(function* setSquadGroupVisibilityEffect() {
      const client = yield* AppHttpApiClient;
      const visibility =
        yield* client.squadBuilderSquadGroup.setSquadGroupVisibility({
          payload,
        });
      const groupPayload = groupPayloadFromMutation(payload);
      get.refresh(squadGroupDetailAtom(groupPayload));
      get.refresh(ownedSquadGroupsAtom({ actorUserId: payload.actorUserId }));
      return visibility;
    })
);
