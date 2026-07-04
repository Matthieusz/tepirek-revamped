import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/unstable/httpapi";

import {
  ConfirmOwnedAccountImportPayload,
  OwnedMargonemAccountSummarySchema,
  PreviewMargonemProfileImportPayload,
  PreviewMargonemProfileImportSuccess,
  PreviewOwnedAccountImportsPayload,
  PreviewOwnedAccountImportsSuccess,
} from "./schema/account-import.js";
import {
  ApplyAccountRefetchPayload,
  ApplyAccountRefetchSuccess,
  PreviewAccountRefetchPayload,
  PreviewAccountRefetchSuccess,
} from "./schema/account-refetch.js";
import {
  AccountAccessGrantSummarySchema,
  AccountAccessGrantsPayload,
  AccountAccessInviteSummarySchema,
  AccountInviteTargetSchema,
  RespondToAccountAccessInvitePayload,
  RevokeAccountAccessPayload,
  RevokeAccountAccessSuccess,
  SearchAccountInviteTargetsPayload,
  SendAccountAccessInvitePayload,
  SharedMargonemAccountSummarySchema,
} from "./schema/account-sharing.js";
import { ActorPayload, SquadBuilderServiceError } from "./schema/common.js";
import {
  RespondToSquadGroupInvitePayload,
  RevokeSquadGroupEditorPayload,
  SearchSquadEditorInviteTargetsPayload,
  SendSquadGroupEditorInvitePayload,
  SharedSquadGroupSummarySchema,
  SquadEditorInviteTargetSchema,
  SquadGroupEditorGrantsPayload,
  SquadGroupEditorGrantSummarySchema,
  SquadGroupInvitationSummarySchema,
} from "./schema/squad-group-sharing.js";

export { ActorPayload, SquadBuilderServiceError } from "./schema/common.js";
export {
  ConfirmOwnedAccountImportPayload,
  OwnedMargonemAccountSummarySchema,
  PreviewMargonemProfileImportPayload,
  PreviewMargonemProfileImportSuccess,
  PreviewOwnedAccountImportsPayload,
  PreviewOwnedAccountImportsSuccess,
} from "./schema/account-import.js";
export {
  ApplyAccountRefetchPayload,
  ApplyAccountRefetchSuccess,
  PreviewAccountRefetchPayload,
  PreviewAccountRefetchSuccess,
} from "./schema/account-refetch.js";
export {
  AccountAccessGrantSummarySchema,
  AccountAccessGrantsPayload,
  AccountAccessInviteSummarySchema,
  AccountInviteTargetSchema,
  RespondToAccountAccessInvitePayload,
  RevokeAccountAccessPayload,
  RevokeAccountAccessSuccess,
  SearchAccountInviteTargetsPayload,
  SendAccountAccessInvitePayload,
  SharedMargonemAccountSummarySchema,
} from "./schema/account-sharing.js";
export {
  RespondToSquadGroupInvitePayload,
  RevokeSquadGroupEditorPayload,
  SearchSquadEditorInviteTargetsPayload,
  SendSquadGroupEditorInvitePayload,
  SharedSquadGroupSummarySchema,
  SquadEditorInviteTargetSchema,
  SquadGroupEditorGrantSummarySchema,
  SquadGroupEditorGrantsPayload,
  SquadGroupInvitationSummarySchema,
} from "./schema/squad-group-sharing.js";

export const SquadBuilderAccountImportGroup = HttpApiGroup.make(
  "squadBuilderAccountImport"
)
  .add(
    HttpApiEndpoint.post("previewMargonemProfileImport", "/preview-profile", {
      error: SquadBuilderServiceError,
      payload: PreviewMargonemProfileImportPayload,
      success: PreviewMargonemProfileImportSuccess,
    }),
    HttpApiEndpoint.post("previewOwnedAccountImports", "/preview-owned", {
      error: SquadBuilderServiceError,
      payload: PreviewOwnedAccountImportsPayload,
      success: PreviewOwnedAccountImportsSuccess,
    }),
    HttpApiEndpoint.post("confirmOwnedAccountImport", "/confirm-owned", {
      error: SquadBuilderServiceError,
      payload: ConfirmOwnedAccountImportPayload,
      success: OwnedMargonemAccountSummarySchema,
    })
  )
  .prefix("/squad-builder/account-imports");

export const SquadBuilderAccountRefetchGroup = HttpApiGroup.make(
  "squadBuilderAccountRefetch"
)
  .add(
    HttpApiEndpoint.post("previewAccountRefetch", "/preview", {
      error: SquadBuilderServiceError,
      payload: PreviewAccountRefetchPayload,
      success: PreviewAccountRefetchSuccess,
    }),
    HttpApiEndpoint.post("applyAccountRefetch", "/apply", {
      error: SquadBuilderServiceError,
      payload: ApplyAccountRefetchPayload,
      success: ApplyAccountRefetchSuccess,
    })
  )
  .prefix("/squad-builder/account-refetches");

export const SquadBuilderAccountSharingGroup = HttpApiGroup.make(
  "squadBuilderAccountSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchAccountInviteTargets",
      "/invite-targets/search",
      {
        error: SquadBuilderServiceError,
        payload: SearchAccountInviteTargetsPayload,
        success: Schema.Array(AccountInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendAccountAccessInvite", "/invites", {
      error: SquadBuilderServiceError,
      payload: SendAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("respondToAccountAccessInvite", "/invites/respond", {
      error: SquadBuilderServiceError,
      payload: RespondToAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("revokeAccountAccess", "/access/revoke", {
      error: SquadBuilderServiceError,
      payload: RevokeAccountAccessPayload,
      success: RevokeAccountAccessSuccess,
    }),
    HttpApiEndpoint.post("listIncomingAccountInvites", "/incoming-invites", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(AccountAccessInviteSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedAccounts", "/shared-accounts", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(SharedMargonemAccountSummarySchema),
    }),
    HttpApiEndpoint.post("listAccountAccessGrants", "/access-grants", {
      error: SquadBuilderServiceError,
      payload: AccountAccessGrantsPayload,
      success: Schema.Array(AccountAccessGrantSummarySchema),
    })
  )
  .prefix("/squad-builder/account-sharing");

export const SquadBuilderSquadGroupSharingGroup = HttpApiGroup.make(
  "squadBuilderSquadGroupSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchSquadEditorInviteTargets",
      "/editor-targets/search",
      {
        error: SquadBuilderServiceError,
        payload: SearchSquadEditorInviteTargetsPayload,
        success: Schema.Array(SquadEditorInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendSquadGroupEditorInvite", "/editor-invites", {
      error: SquadBuilderServiceError,
      payload: SendSquadGroupEditorInvitePayload,
      success: SquadGroupInvitationSummarySchema,
    }),
    HttpApiEndpoint.post(
      "respondToSquadGroupInvite",
      "/editor-invites/respond",
      {
        error: SquadBuilderServiceError,
        payload: RespondToSquadGroupInvitePayload,
        success: SquadGroupInvitationSummarySchema,
      }
    ),
    HttpApiEndpoint.post("revokeSquadGroupEditor", "/editors/revoke", {
      error: SquadBuilderServiceError,
      payload: RevokeSquadGroupEditorPayload,
      success: SquadGroupInvitationSummarySchema,
    }),
    HttpApiEndpoint.post("listIncomingSquadGroupInvites", "/incoming-invites", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(SquadGroupInvitationSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedSquadGroups", "/shared-groups", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(SharedSquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("listSquadGroupEditorGrants", "/editor-grants", {
      error: SquadBuilderServiceError,
      payload: SquadGroupEditorGrantsPayload,
      success: Schema.Array(SquadGroupEditorGrantSummarySchema),
    }),
    HttpApiEndpoint.post(
      "countPendingSquadGroupInvites",
      "/pending-invite-count",
      {
        error: SquadBuilderServiceError,
        payload: ActorPayload,
        success: Schema.Number,
      }
    )
  )
  .prefix("/squad-builder/squad-group-sharing");

export const SquadBuilderHttpApi = HttpApi.make("squadBuilder")
  .add(SquadBuilderAccountImportGroup)
  .add(SquadBuilderAccountRefetchGroup)
  .add(SquadBuilderAccountSharingGroup)
  .add(SquadBuilderSquadGroupSharingGroup);

export type SquadBuilderHttpApi = typeof SquadBuilderHttpApi;
