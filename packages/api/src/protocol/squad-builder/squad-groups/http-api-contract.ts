/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  AvailableSquadCharacterSchema,
  CreateSquadGroupPayload,
  GlobalSquadGroupSummarySchema,
  ListGlobalSquadGroupsPayload,
  SaveSharedSquadGroupCharactersPayload,
  SaveSquadGroupPayload,
  SetSquadGroupVisibilityPayload,
  SquadGroupDetailSchema,
  SquadGroupIdPayload,
  SquadGroupSummarySchema,
  SquadGroupVisibilityChangeSchema,
} from "./squad-groups-schema.js";

export class SquadBuilderUnauthorized extends Schema.TaggedErrorClass<SquadBuilderUnauthorized>()(
  "SquadBuilderUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class SquadBuilderForbidden extends Schema.TaggedErrorClass<SquadBuilderForbidden>()(
  "SquadBuilderForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

export class SquadBuilderNotFound extends Schema.TaggedErrorClass<SquadBuilderNotFound>()(
  "SquadBuilderNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

export class SquadBuilderConflict extends Schema.TaggedErrorClass<SquadBuilderConflict>()(
  "SquadBuilderConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}

export class SquadBuilderInvalidInput extends Schema.TaggedErrorClass<SquadBuilderInvalidInput>()(
  "SquadBuilderInvalidInput",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

export class SquadBuilderUpstreamUnavailable extends Schema.TaggedErrorClass<SquadBuilderUpstreamUnavailable>()(
  "SquadBuilderUpstreamUnavailable",
  { message: Schema.String },
  { httpApiStatus: 502 }
) {}

export class SquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<SquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String },
  { httpApiStatus: 503 }
) {}

export const SquadBuilderSquadGroupErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderUpstreamUnavailable,
  SquadBuilderPersistenceUnavailable,
] as const;

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
