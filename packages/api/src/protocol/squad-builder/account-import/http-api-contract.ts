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
  ConfirmOwnedAccountImportPayload,
  DeleteOwnedAccountPayload,
  DeleteOwnedAccountSuccess,
  OwnedMargonemAccountSummarySchema,
  PreviewMargonemProfileImportPayload,
  PreviewMargonemProfileImportSuccess,
  PreviewOwnedAccountImportsPayload,
  PreviewOwnedAccountImportsSuccess,
  UpdateOwnedAccountDisplayNamePayload,
} from "./account-import-schema.ts";

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
  ...SquadBuilderErrorsWithUpstream,
]);

export const SquadBuilderAccountImportErrors = SquadBuilderErrorsWithUpstream;

export const SquadBuilderAccountImportGroup = HttpApiGroup.make(
  "squadBuilderAccountImport"
)
  .add(
    HttpApiEndpoint.post("previewMargonemProfileImport", "/preview-profile", {
      error: SquadBuilderAccountImportErrors,
      payload: PreviewMargonemProfileImportPayload,
      success: PreviewMargonemProfileImportSuccess,
    }),
    HttpApiEndpoint.post("previewOwnedAccountImports", "/preview-owned", {
      error: SquadBuilderAccountImportErrors,
      payload: PreviewOwnedAccountImportsPayload,
      success: PreviewOwnedAccountImportsSuccess,
    }),
    HttpApiEndpoint.post("confirmOwnedAccountImport", "/confirm-owned", {
      error: SquadBuilderAccountImportErrors,
      payload: ConfirmOwnedAccountImportPayload,
      success: OwnedMargonemAccountSummarySchema,
    }),
    HttpApiEndpoint.post("updateOwnedAccountDisplayName", "/rename-owned", {
      error: SquadBuilderAccountImportErrors,
      payload: UpdateOwnedAccountDisplayNamePayload,
      success: OwnedMargonemAccountSummarySchema,
    }),
    HttpApiEndpoint.post("deleteOwnedAccount", "/delete-owned", {
      error: SquadBuilderAccountImportErrors,
      payload: DeleteOwnedAccountPayload,
      success: DeleteOwnedAccountSuccess,
    }),
    HttpApiEndpoint.post("listOwnedAccounts", "/owned", {
      error: SquadBuilderAccountImportErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(OwnedMargonemAccountSummarySchema),
    })
  )
  .prefix("/squad-builder/account-imports");
