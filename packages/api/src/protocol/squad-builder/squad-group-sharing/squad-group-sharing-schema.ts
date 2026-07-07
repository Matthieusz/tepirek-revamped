import * as Schema from "effect/Schema";

import { AppUserIdSchema } from "../../../domain/squad-builder/app-user-id.js";
import { SquadGroupIdSchema } from "../../../domain/squad-builder/squad-group-id.js";
import { SquadGroupInvitationIdSchema } from "../../../domain/squad-builder/squad-group-invitation-id.js";
import {
  ActiveSquadGroupInvitationStatusSchema,
  SquadGroupInvitationStatusSchema,
} from "../../../domain/squad-builder/squad-group-invitation-status.js";
import {
  AccountInviteTargetSchema,
  InviteResponseSchema,
} from "../account-sharing/account-sharing-schema.js";

export const SquadEditorInviteTargetSchema = AccountInviteTargetSchema;
export const SearchSquadEditorInviteTargetsPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
  query: Schema.String,
});
export const SendSquadGroupEditorInvitePayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
  invitedUserId: AppUserIdSchema,
});
export const SquadGroupInvitationSummarySchema = Schema.Struct({
  createdAt: Schema.Date,
  invitationId: SquadGroupInvitationIdSchema,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadGroupId: SquadGroupIdSchema,
  squadGroupName: Schema.String,
  status: SquadGroupInvitationStatusSchema,
  updatedAt: Schema.Date,
});
export const RespondToSquadGroupInvitePayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  invitationId: SquadGroupInvitationIdSchema,
  response: InviteResponseSchema,
});
export const RevokeSquadGroupEditorPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  invitationId: SquadGroupInvitationIdSchema,
});
export const SquadGroupEditorGrantsPayload = Schema.Struct({
  actorUserId: AppUserIdSchema,
  groupId: SquadGroupIdSchema,
});
export const SharedSquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Number,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadCount: Schema.Number,
  updatedAt: Schema.Date,
});
export const SquadGroupEditorGrantSummarySchema = Schema.Struct({
  createdAt: Schema.Date,
  invitationId: SquadGroupInvitationIdSchema,
  status: ActiveSquadGroupInvitationStatusSchema,
  updatedAt: Schema.Date,
  userId: AppUserIdSchema,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.String,
});
