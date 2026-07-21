import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  SquadBuilderConflict,
  SquadBuilderErrorsWithUpstream,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
  SquadBuilderUpstreamUnavailable,
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

export {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
  SquadBuilderUpstreamUnavailable,
};

export const SquadBuilderSquadGroupErrors = SquadBuilderErrorsWithUpstream;

export const SquadBuilderSquadGroupError = Schema.Union(
  SquadBuilderSquadGroupErrors
);

export const SquadBuilderSquadGroupGroup = HttpApiGroup.make(
  "squadBuilderSquadGroup"
)
  .add(
    HttpApiEndpoint.post("createSquadGroup", "/", {
      error: SquadBuilderSquadGroupErrors,
      payload: CreateSquadGroupPayload,
      success: SquadGroupSummarySchema,
    }),
    HttpApiEndpoint.post("listOwnedSquadGroups", "/owned", {
      error: SquadBuilderSquadGroupErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(SquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("deleteSquadGroup", "/delete", {
      error: SquadBuilderSquadGroupErrors,
      payload: SquadGroupIdPayload,
      success: DeleteSquadGroupSuccessSchema,
    }),
    HttpApiEndpoint.post("listGlobalSquadGroups", "/global", {
      error: SquadBuilderSquadGroupErrors,
      payload: ListGlobalSquadGroupsPayload,
      success: Schema.Array(GlobalSquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("getSquadGroupDetail", "/detail", {
      error: SquadBuilderSquadGroupErrors,
      payload: SquadGroupIdPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("listAvailableSquadCharacters", "/characters", {
      error: SquadBuilderSquadGroupErrors,
      payload: SquadGroupIdPayload,
      success: Schema.Array(AvailableSquadCharacterSchema),
    }),
    HttpApiEndpoint.post("saveSquadGroup", "/save", {
      error: SquadBuilderSquadGroupErrors,
      payload: SaveSquadGroupPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("saveSharedSquadGroupCharacters", "/save-shared", {
      error: SquadBuilderSquadGroupErrors,
      payload: SaveSharedSquadGroupCharactersPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("setSquadGroupVisibility", "/visibility", {
      error: SquadBuilderSquadGroupErrors,
      payload: SetSquadGroupVisibilityPayload,
      success: SquadGroupVisibilityChangeSchema,
    })
  )
  .prefix("/squad-builder/squad-groups");
