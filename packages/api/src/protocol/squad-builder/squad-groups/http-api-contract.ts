import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
} from "../errors.ts";
import {
  AvailableSquadCharacterSchema,
  CreateSquadGroupPayload,
  DeleteSquadGroupSuccessSchema,
  GlobalSquadGroupSummarySchema,
  ListGlobalSquadGroupsPayload,
  SaveSharedSquadGroupCharactersPayload,
  SaveSquadGroupPayload,
  SetSquadGroupVisibilityPayload,
  SquadGroupDetailSchema,
  SquadGroupIdPayload,
  SquadGroupSummarySchema,
  SquadGroupVisibilityChangeSchema,
} from "./squad-groups-schema.ts";

export const CreateSquadGroupErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListOwnedSquadGroupsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderPersistenceUnavailable,
] as const;

export const DeleteSquadGroupErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListGlobalSquadGroupsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const GetSquadGroupDetailErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListAvailableSquadCharactersErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SaveSquadGroupErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SaveSharedSquadGroupCharactersErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SetSquadGroupVisibilityErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SquadBuilderSquadGroupGroup = HttpApiGroup.make(
  "squadBuilderSquadGroup"
)
  .add(
    HttpApiEndpoint.post("createSquadGroup", "/", {
      error: CreateSquadGroupErrors,
      payload: CreateSquadGroupPayload,
      success: SquadGroupSummarySchema,
    }),
    HttpApiEndpoint.post("listOwnedSquadGroups", "/owned", {
      error: ListOwnedSquadGroupsErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(SquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("deleteSquadGroup", "/delete", {
      error: DeleteSquadGroupErrors,
      payload: SquadGroupIdPayload,
      success: DeleteSquadGroupSuccessSchema,
    }),
    HttpApiEndpoint.post("listGlobalSquadGroups", "/global", {
      error: ListGlobalSquadGroupsErrors,
      payload: ListGlobalSquadGroupsPayload,
      success: Schema.Array(GlobalSquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("getSquadGroupDetail", "/detail", {
      error: GetSquadGroupDetailErrors,
      payload: SquadGroupIdPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("listAvailableSquadCharacters", "/characters", {
      error: ListAvailableSquadCharactersErrors,
      payload: SquadGroupIdPayload,
      success: Schema.Array(AvailableSquadCharacterSchema),
    }),
    HttpApiEndpoint.post("saveSquadGroup", "/save", {
      error: SaveSquadGroupErrors,
      payload: SaveSquadGroupPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("saveSharedSquadGroupCharacters", "/save-shared", {
      error: SaveSharedSquadGroupCharactersErrors,
      payload: SaveSharedSquadGroupCharactersPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("setSquadGroupVisibility", "/visibility", {
      error: SetSquadGroupVisibilityErrors,
      payload: SetSquadGroupVisibilityPayload,
      success: SquadGroupVisibilityChangeSchema,
    })
  )
  .prefix("/squad-builder/squad-groups");
