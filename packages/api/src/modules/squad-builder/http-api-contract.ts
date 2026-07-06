import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/unstable/httpapi";

import { AppUserIdSchema } from "./app-user-id.js";
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
} from "./schema/squad-groups.js";

const ActorPayload = Schema.Struct({ actorUserId: AppUserIdSchema });
const SquadBuilderServiceError = Schema.Struct({ _tag: Schema.String });

export const SquadBuilderSquadGroupGroup = HttpApiGroup.make(
  "squadBuilderSquadGroup"
)
  .add(
    HttpApiEndpoint.post("createSquadGroup", "/", {
      error: SquadBuilderServiceError,
      payload: CreateSquadGroupPayload,
      success: SquadGroupSummarySchema,
    }),
    HttpApiEndpoint.post("listOwnedSquadGroups", "/owned", {
      error: SquadBuilderServiceError,
      payload: ActorPayload,
      success: Schema.Array(SquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("listGlobalSquadGroups", "/global", {
      error: SquadBuilderServiceError,
      payload: ListGlobalSquadGroupsPayload,
      success: Schema.Array(GlobalSquadGroupSummarySchema),
    }),
    HttpApiEndpoint.post("getSquadGroupDetail", "/detail", {
      error: SquadBuilderServiceError,
      payload: SquadGroupIdPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("listAvailableSquadCharacters", "/characters", {
      error: SquadBuilderServiceError,
      payload: SquadGroupIdPayload,
      success: Schema.Array(AvailableSquadCharacterSchema),
    }),
    HttpApiEndpoint.post("saveSquadGroup", "/save", {
      error: SquadBuilderServiceError,
      payload: SaveSquadGroupPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("saveSharedSquadGroupCharacters", "/save-shared", {
      error: SquadBuilderServiceError,
      payload: SaveSharedSquadGroupCharactersPayload,
      success: SquadGroupDetailSchema,
    }),
    HttpApiEndpoint.post("setSquadGroupVisibility", "/visibility", {
      error: SquadBuilderServiceError,
      payload: SetSquadGroupVisibilityPayload,
      success: SquadGroupVisibilityChangeSchema,
    })
  )
  .prefix("/squad-builder/squad-groups");

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
  .add(SquadBuilderSquadGroupGroup)
  .add(SquadBuilderAccountSharingGroup)
  .add(SquadBuilderSquadGroupSharingGroup);

export type SquadBuilderHttpApi = typeof SquadBuilderHttpApi;
