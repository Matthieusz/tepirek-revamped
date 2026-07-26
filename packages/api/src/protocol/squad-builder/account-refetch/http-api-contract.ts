import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
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

export const PreviewAccountRefetchErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderInvalidInput,
  SquadBuilderUpstreamUnavailable,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ApplyAccountRefetchErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SquadBuilderAccountRefetchGroup = HttpApiGroup.make(
  "squadBuilderAccountRefetch"
)
  .add(
    HttpApiEndpoint.post("previewAccountRefetch", "/preview", {
      error: PreviewAccountRefetchErrors,
      payload: PreviewAccountRefetchPayload,
      success: PreviewAccountRefetchSuccess,
    }),
    HttpApiEndpoint.post("applyAccountRefetch", "/apply", {
      error: ApplyAccountRefetchErrors,
      payload: ApplyAccountRefetchPayload,
      success: ApplyAccountRefetchSuccess,
    })
  )
  .prefix("/squad-builder/account-refetches");
