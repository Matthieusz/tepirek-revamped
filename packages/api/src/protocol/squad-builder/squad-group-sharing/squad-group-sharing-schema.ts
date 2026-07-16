import * as Schema from "effect/Schema";

import { AppUserIdSchema } from "../../../domain/squad-builder/app-user-id.ts";
import { SquadGroupIdSchema } from "../../../domain/squad-builder/squad-group-id.ts";
import { SquadGroupInvitationIdSchema } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import {
  ActiveSquadGroupInvitationStatusSchema,
  SquadGroupInvitationStatusSchema,
} from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import {
  AccountInviteTargetSchema,
  InviteResponseSchema,
} from "../account-sharing/account-sharing-schema.ts";

export const SquadEditorInviteTargetSchema = AccountInviteTargetSchema;
export const SearchSquadEditorInviteTargetsPayload = Schema.Struct({
  groupId: SquadGroupIdSchema,
  query: Schema.String,
});
export const SendSquadGroupEditorInvitePayload = Schema.Struct({
  groupId: SquadGroupIdSchema,
  invitedUserId: AppUserIdSchema,
});
export const SquadGroupInvitationSummarySchema = Schema.Struct({
  createdAt: Schema.DateFromString,
  invitationId: SquadGroupInvitationIdSchema,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadGroupId: SquadGroupIdSchema,
  squadGroupName: Schema.String,
  status: SquadGroupInvitationStatusSchema,
  updatedAt: Schema.DateFromString,
});
export const RespondToSquadGroupInvitePayload = Schema.Struct({
  invitationId: SquadGroupInvitationIdSchema,
  response: InviteResponseSchema,
});
export const RevokeSquadGroupEditorPayload = Schema.Struct({
  invitationId: SquadGroupInvitationIdSchema,
});
export const SquadGroupEditorGrantsPayload = Schema.Struct({
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
  updatedAt: Schema.DateFromString,
});
export const SquadGroupEditorGrantSummarySchema = Schema.Struct({
  createdAt: Schema.DateFromString,
  invitationId: SquadGroupInvitationIdSchema,
  status: ActiveSquadGroupInvitationStatusSchema,
  updatedAt: Schema.DateFromString,
  userId: AppUserIdSchema,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.String,
});
