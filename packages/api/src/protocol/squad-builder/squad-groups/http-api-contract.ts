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

export const SquadBuilderSquadGroupError = Schema.Union([
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderUpstreamUnavailable,
  SquadBuilderPersistenceUnavailable,
]);

export const SquadBuilderSquadGroupGroup = HttpApiGroup.make(
  "squadBuilderSquadGroup"
)
  .add(
    HttpApiEndpoint.post("createSquadGroup", "/", {
      error: SquadBuilderSquadGroupError,
      payload: CreateSquadGroupPayload,
      success: SquadGroupSummarySchema,
    }),
    HttpApiEndpoint.post("listOwnedSquadGroups", "/owned", {
      error: SquadBuilderSquadGroupError,
      payload: Schema.Struct({ actorUserId: Schema.String }),
      success: Schema.Array(SquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("listGlobalSquadGroups", "/global", {
      error: SquadBuilderSquadGroupError,
      payload: ListGlobalSquadGroupsPayload,
      success: Schema.Array(GlobalSquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("getSquadGroupDetail", "/detail", {
      error: SquadBuilderSquadGroupError,
      payload: SquadGroupIdPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("listAvailableSquadCharacters", "/characters", {
      error: SquadBuilderSquadGroupError,
      payload: SquadGroupIdPayload,
      success: Schema.Array(AvailableSquadCharacterSchema),
    }),
    HttpApiEndpoint.post("saveSquadGroup", "/save", {
      error: SquadBuilderSquadGroupError,
      payload: SaveSquadGroupPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("saveSharedSquadGroupCharacters", "/save-shared", {
      error: SquadBuilderSquadGroupError,
      payload: SaveSharedSquadGroupCharactersPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("setSquadGroupVisibility", "/visibility", {
      error: SquadBuilderSquadGroupError,
      payload: SetSquadGroupVisibilityPayload,
      success: SquadGroupVisibilityChangeSchema,
    })
  )
  .prefix("/squad-builder/squad-groups");
