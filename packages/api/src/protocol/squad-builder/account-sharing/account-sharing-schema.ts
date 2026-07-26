/* eslint-disable import/namespace, typescript/no-empty-interface, typescript/no-empty-object-type -- Schema record interfaces intentionally merge runtime schemas with their inferred types. */
import * as Schema from "effect/Schema";

import {
  AccountAccessStatusSchema,
  ActiveAccountAccessStatusSchema,
} from "../../../domain/squad-builder/account-access-status.ts";
import { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { MargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";

/** HTTP/API schema for an invite response command. */
export const InviteResponseSchema = Schema.Literals(["accept", "decline"]);

export const AccountInviteTargetSchema = Schema.Struct({
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
  userId: AppUserId,
});
export interface AccountInviteTargetSchema extends Schema.Schema.Type<
  typeof AccountInviteTargetSchema
> {}
export const SearchAccountInviteTargetsPayload = Schema.Struct({
  accountId: MargonemAccountId,
  query: Schema.String,
});
export interface SearchAccountInviteTargetsPayload extends Schema.Schema.Type<
  typeof SearchAccountInviteTargetsPayload
> {}
export const SendAccountAccessInvitePayload = Schema.Struct({
  accountId: MargonemAccountId,
  invitedUserId: AppUserId,
});
export interface SendAccountAccessInvitePayload extends Schema.Schema.Type<
  typeof SendAccountAccessInvitePayload
> {}
export const AccountAccessInviteSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessId,
  accountDisplayName: Schema.String,
  accountId: MargonemAccountId,
  createdAt: Schema.DateFromString,
  generatedProfileUrl: Schema.String,
  invitedUserId: AppUserId,
  ownerUserId: AppUserId,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  status: AccountAccessStatusSchema,
  updatedAt: Schema.DateFromString,
});
export interface AccountAccessInviteSummarySchema extends Schema.Schema.Type<
  typeof AccountAccessInviteSummarySchema
> {}
export const RespondToAccountAccessInvitePayload = Schema.Struct({
  accessId: MargonemAccountAccessId,
  response: InviteResponseSchema,
});
export interface RespondToAccountAccessInvitePayload extends Schema.Schema.Type<
  typeof RespondToAccountAccessInvitePayload
> {}
export const RevokeAccountAccessPayload = Schema.Struct({
  accessId: MargonemAccountAccessId,
});
export interface RevokeAccountAccessPayload extends Schema.Schema.Type<
  typeof RevokeAccountAccessPayload
> {}
export const RevokeAccountAccessSuccess = Schema.Struct({
  accessId: MargonemAccountAccessId,
  accountId: MargonemAccountId,
  removedSquadCharacterCount: Schema.Finite,
  revokedUserId: AppUserId,
});
export interface RevokeAccountAccessSuccess extends Schema.Schema.Type<
  typeof RevokeAccountAccessSuccess
> {}
export const AccountAccessGrantsPayload = Schema.Struct({
  accountId: MargonemAccountId,
});
export interface AccountAccessGrantsPayload extends Schema.Schema.Type<
  typeof AccountAccessGrantsPayload
> {}
export const SharedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountId,
  characterCount: Schema.Finite,
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.DateFromString,
  ownerUserId: AppUserId,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  profileId: MargonemProfileId,
});
export interface SharedMargonemAccountSummarySchema extends Schema.Schema.Type<
  typeof SharedMargonemAccountSummarySchema
> {}
export const AccountAccessGrantSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessId,
  createdAt: Schema.DateFromString,
  invitedUserId: AppUserId,
  invitedUserImage: Schema.NullOr(Schema.String),
  invitedUserName: Schema.String,
  status: ActiveAccountAccessStatusSchema,
  updatedAt: Schema.DateFromString,
});
export interface AccountAccessGrantSummarySchema extends Schema.Schema.Type<
  typeof AccountAccessGrantSummarySchema
> {}
