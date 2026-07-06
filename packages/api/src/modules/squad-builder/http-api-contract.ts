import * as Schema from "effect/Schema";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/unstable/httpapi";

import { AppUserIdSchema } from "./app-user-id.js";
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

const ActorPayload = Schema.Struct({ actorUserId: AppUserIdSchema });
const SquadBuilderServiceError = Schema.Struct({ _tag: Schema.String });

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

export const SquadBuilderHttpApi = HttpApi.make("squadBuilder").add(
  SquadBuilderSquadGroupSharingGroup
);

export type SquadBuilderHttpApi = typeof SquadBuilderHttpApi;
