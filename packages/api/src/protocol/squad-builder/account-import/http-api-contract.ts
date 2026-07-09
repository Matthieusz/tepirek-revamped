import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
  SquadBuilderUpstreamUnavailable,
} from "../errors.js";
import {
  ConfirmOwnedAccountImportPayload,
  OwnedMargonemAccountSummarySchema,
  PreviewMargonemProfileImportPayload,
  PreviewMargonemProfileImportSuccess,
  PreviewOwnedAccountImportsPayload,
  PreviewOwnedAccountImportsSuccess,
} from "./account-import-schema.js";

export {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
  SquadBuilderUpstreamUnavailable,
};

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
      payload: Schema.Struct({}),
      success: Schema.Array(OwnedMargonemAccountSummarySchema),
    })
  )
  .prefix("/squad-builder/account-imports");
