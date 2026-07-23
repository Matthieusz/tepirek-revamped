/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
import * as Schema from "effect/Schema";

import {
  AccountAccessStatusSchema,
  ActiveAccountAccessStatusSchema,
} from "../../../domain/squad-builder/account-access-status.ts";
import { AppUserIdSchema } from "../../../domain/squad-builder/app-user-id.ts";
import { MargonemAccountAccessIdSchema } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { MargonemAccountIdSchema } from "../../../domain/squad-builder/margonem-account-id.ts";
import { MargonemProfileIdSchema } from "../../../domain/squad-builder/margonem-profile-id.ts";

/** HTTP/API schema for an invite response command. */
export const InviteResponseSchema = Schema.Literals(["accept", "decline"]);

export const AccountInviteTargetSchema = Schema.Struct({
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
  userId: AppUserIdSchema,
});
export interface AccountInviteTargetSchema extends Schema.Schema.Type<
  typeof AccountInviteTargetSchema
> {}
export const SearchAccountInviteTargetsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  query: Schema.String,
});
export interface SearchAccountInviteTargetsPayload extends Schema.Schema.Type<
  typeof SearchAccountInviteTargetsPayload
> {}
export const SendAccountAccessInvitePayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  invitedUserId: AppUserIdSchema,
});
export interface SendAccountAccessInvitePayload extends Schema.Schema.Type<
  typeof SendAccountAccessInvitePayload
> {}
export const AccountAccessInviteSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  accountDisplayName: Schema.String,
  accountId: MargonemAccountIdSchema,
  createdAt: Schema.DateFromString,
  generatedProfileUrl: Schema.String,
  invitedUserId: AppUserIdSchema,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  status: AccountAccessStatusSchema,
  updatedAt: Schema.DateFromString,
});
export interface AccountAccessInviteSummarySchema extends Schema.Schema.Type<
  typeof AccountAccessInviteSummarySchema
> {}
export const RespondToAccountAccessInvitePayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  response: InviteResponseSchema,
});
export interface RespondToAccountAccessInvitePayload extends Schema.Schema.Type<
  typeof RespondToAccountAccessInvitePayload
> {}
export const RevokeAccountAccessPayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
});
export interface RevokeAccountAccessPayload extends Schema.Schema.Type<
  typeof RevokeAccountAccessPayload
> {}
export const RevokeAccountAccessSuccess = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  accountId: MargonemAccountIdSchema,
  removedSquadCharacterCount: Schema.Finite,
  revokedUserId: AppUserIdSchema,
});
export interface RevokeAccountAccessSuccess extends Schema.Schema.Type<
  typeof RevokeAccountAccessSuccess
> {}
export const AccountAccessGrantsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
});
export interface AccountAccessGrantsPayload extends Schema.Schema.Type<
  typeof AccountAccessGrantsPayload
> {}
export const SharedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  characterCount: Schema.Finite,
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.DateFromString,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  profileId: MargonemProfileIdSchema,
});
export interface SharedMargonemAccountSummarySchema extends Schema.Schema.Type<
  typeof SharedMargonemAccountSummarySchema
> {}
export const AccountAccessGrantSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  createdAt: Schema.DateFromString,
  invitedUserId: AppUserIdSchema,
  invitedUserImage: Schema.NullOr(Schema.String),
  invitedUserName: Schema.String,
  status: ActiveAccountAccessStatusSchema,
  updatedAt: Schema.DateFromString,
});
export interface AccountAccessGrantSummarySchema extends Schema.Schema.Type<
  typeof AccountAccessGrantSummarySchema
> {}
