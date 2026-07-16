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
  ApplyAccountRefetchPayload,
  ApplyAccountRefetchSuccess,
  PreviewAccountRefetchPayload,
  PreviewAccountRefetchSuccess,
} from "./account-refetch-schema.ts";

export {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
  SquadBuilderUpstreamUnavailable,
};

export const SquadBuilderAccountRefetchError = Schema.Union([
  ...SquadBuilderErrorsWithUpstream,
]);

export const SquadBuilderAccountRefetchErrors = SquadBuilderErrorsWithUpstream;

export const SquadBuilderAccountRefetchGroup = HttpApiGroup.make(
  "squadBuilderAccountRefetch"
)
  .add(
    HttpApiEndpoint.post("previewAccountRefetch", "/preview", {
      error: SquadBuilderAccountRefetchErrors,
      payload: PreviewAccountRefetchPayload,
      success: PreviewAccountRefetchSuccess,
    }),
    HttpApiEndpoint.post("applyAccountRefetch", "/apply", {
      error: SquadBuilderAccountRefetchErrors,
      payload: ApplyAccountRefetchPayload,
      success: ApplyAccountRefetchSuccess,
    })
  )
  .prefix("/squad-builder/account-refetches");
