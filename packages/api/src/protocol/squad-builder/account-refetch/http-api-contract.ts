/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  ApplyAccountRefetchPayload,
  ApplyAccountRefetchSuccess,
  PreviewAccountRefetchPayload,
  PreviewAccountRefetchSuccess,
} from "../../../modules/squad-builder/schema/account-refetch.js";

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

export const SquadBuilderAccountRefetchError = Schema.Union([
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderUpstreamUnavailable,
  SquadBuilderPersistenceUnavailable,
]);

export const SquadBuilderAccountRefetchGroup = HttpApiGroup.make(
  "squadBuilderAccountRefetch"
)
  .add(
    HttpApiEndpoint.post("previewAccountRefetch", "/preview", {
      error: SquadBuilderAccountRefetchError,
      payload: PreviewAccountRefetchPayload,
      success: PreviewAccountRefetchSuccess,
    }),
    HttpApiEndpoint.post("applyAccountRefetch", "/apply", {
      error: SquadBuilderAccountRefetchError,
      payload: ApplyAccountRefetchPayload,
      success: ApplyAccountRefetchSuccess,
    })
  )
  .prefix("/squad-builder/account-refetches");
