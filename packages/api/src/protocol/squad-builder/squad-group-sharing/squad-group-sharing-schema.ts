/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
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
export interface SearchSquadEditorInviteTargetsPayload extends Schema.Schema
  .Type<typeof SearchSquadEditorInviteTargetsPayload> {}
export const SendSquadGroupEditorInvitePayload = Schema.Struct({
  groupId: SquadGroupIdSchema,
  invitedUserId: AppUserIdSchema,
});
export interface SendSquadGroupEditorInvitePayload extends Schema.Schema.Type<
  typeof SendSquadGroupEditorInvitePayload
> {}
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
export interface SquadGroupInvitationSummarySchema extends Schema.Schema.Type<
  typeof SquadGroupInvitationSummarySchema
> {}
export const RespondToSquadGroupInvitePayload = Schema.Struct({
  invitationId: SquadGroupInvitationIdSchema,
  response: InviteResponseSchema,
});
export interface RespondToSquadGroupInvitePayload extends Schema.Schema.Type<
  typeof RespondToSquadGroupInvitePayload
> {}
export const RevokeSquadGroupEditorPayload = Schema.Struct({
  invitationId: SquadGroupInvitationIdSchema,
});
export interface RevokeSquadGroupEditorPayload extends Schema.Schema.Type<
  typeof RevokeSquadGroupEditorPayload
> {}
export const SquadGroupEditorGrantsPayload = Schema.Struct({
  groupId: SquadGroupIdSchema,
});
export interface SquadGroupEditorGrantsPayload extends Schema.Schema.Type<
  typeof SquadGroupEditorGrantsPayload
> {}
export const SharedSquadGroupSummarySchema = Schema.Struct({
  characterCount: Schema.Finite,
  groupId: SquadGroupIdSchema,
  name: Schema.String,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  squadCount: Schema.Finite,
  updatedAt: Schema.DateFromString,
});
export interface SharedSquadGroupSummarySchema extends Schema.Schema.Type<
  typeof SharedSquadGroupSummarySchema
> {}
export const SquadGroupEditorGrantSummarySchema = Schema.Struct({
  createdAt: Schema.DateFromString,
  invitationId: SquadGroupInvitationIdSchema,
  status: ActiveSquadGroupInvitationStatusSchema,
  updatedAt: Schema.DateFromString,
  userId: AppUserIdSchema,
  userImage: Schema.NullOr(Schema.String),
  userName: Schema.String,
});
export interface SquadGroupEditorGrantSummarySchema extends Schema.Schema.Type<
  typeof SquadGroupEditorGrantSummarySchema
> {}
