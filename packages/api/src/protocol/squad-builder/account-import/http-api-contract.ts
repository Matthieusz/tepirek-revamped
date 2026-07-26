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

export const PreviewMargonemProfileImportErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderUpstreamUnavailable,
  SquadBuilderPersistenceUnavailable,
] as const;

export const PreviewOwnedAccountImportsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ConfirmOwnedAccountImportErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const UpdateOwnedAccountDisplayNameErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const DeleteOwnedAccountErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListOwnedAccountsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SquadBuilderAccountImportGroup = HttpApiGroup.make(
  "squadBuilderAccountImport"
)
  .add(
    HttpApiEndpoint.post("previewMargonemProfileImport", "/preview-profile", {
      error: PreviewMargonemProfileImportErrors,
      payload: PreviewMargonemProfileImportPayload,
      success: PreviewMargonemProfileImportSuccess,
    }),
    HttpApiEndpoint.post("previewOwnedAccountImports", "/preview-owned", {
      error: PreviewOwnedAccountImportsErrors,
      payload: PreviewOwnedAccountImportsPayload,
      success: PreviewOwnedAccountImportsSuccess,
    }),
    HttpApiEndpoint.post("confirmOwnedAccountImport", "/confirm-owned", {
      error: ConfirmOwnedAccountImportErrors,
      payload: ConfirmOwnedAccountImportPayload,
      success: OwnedMargonemAccountSummarySchema,
    }),
    HttpApiEndpoint.post("updateOwnedAccountDisplayName", "/rename-owned", {
      error: UpdateOwnedAccountDisplayNameErrors,
      payload: UpdateOwnedAccountDisplayNamePayload,
      success: OwnedMargonemAccountSummarySchema,
    }),
    HttpApiEndpoint.post("deleteOwnedAccount", "/delete-owned", {
      error: DeleteOwnedAccountErrors,
      payload: DeleteOwnedAccountPayload,
      success: DeleteOwnedAccountSuccess,
    }),
    HttpApiEndpoint.post("listOwnedAccounts", "/owned", {
      error: ListOwnedAccountsErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(OwnedMargonemAccountSummarySchema),
    })
  )
  .prefix("/squad-builder/account-imports");
