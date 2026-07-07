/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import { AppUserIdSchema } from "../../../domain/squad-builder/app-user-id.js";
import {
  ConfirmOwnedAccountImportPayload,
  OwnedMargonemAccountSummarySchema,
  PreviewMargonemProfileImportPayload,
  PreviewMargonemProfileImportSuccess,
  PreviewOwnedAccountImportsPayload,
  PreviewOwnedAccountImportsSuccess,
} from "./account-import-schema.js";

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

const ActorPayload = Schema.Struct({ actorUserId: AppUserIdSchema });

export const SquadBuilderAccountImportError = Schema.Union([
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderUpstreamUnavailable,
  SquadBuilderPersistenceUnavailable,
]);

export const SquadBuilderAccountImportGroup = HttpApiGroup.make(
  "squadBuilderAccountImport"
)
  .add(
    HttpApiEndpoint.post("previewMargonemProfileImport", "/preview-profile", {
      error: SquadBuilderAccountImportError,
      payload: PreviewMargonemProfileImportPayload,
      success: PreviewMargonemProfileImportSuccess,
    }),
    HttpApiEndpoint.post("previewOwnedAccountImports", "/preview-owned", {
      error: SquadBuilderAccountImportError,
      payload: PreviewOwnedAccountImportsPayload,
      success: PreviewOwnedAccountImportsSuccess,
    }),
    HttpApiEndpoint.post("confirmOwnedAccountImport", "/confirm-owned", {
      error: SquadBuilderAccountImportError,
      payload: ConfirmOwnedAccountImportPayload,
      success: OwnedMargonemAccountSummarySchema,
    }),
    HttpApiEndpoint.post("listOwnedAccounts", "/owned", {
      error: SquadBuilderAccountImportError,
      payload: ActorPayload,
      success: Schema.Array(OwnedMargonemAccountSummarySchema),
    })
  )
  .prefix("/squad-builder/account-imports");
