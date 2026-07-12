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
export const SearchAccountInviteTargetsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  query: Schema.String,
});
export const SendAccountAccessInvitePayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  invitedUserId: AppUserIdSchema,
});
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
export const RespondToAccountAccessInvitePayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  response: InviteResponseSchema,
});
export const RevokeAccountAccessPayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
});
export const RevokeAccountAccessSuccess = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  accountId: MargonemAccountIdSchema,
  removedSquadCharacterCount: Schema.Number,
  revokedUserId: AppUserIdSchema,
});
export const AccountAccessGrantsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
});
export const SharedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  characterCount: Schema.Number,
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.DateFromString,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  profileId: MargonemProfileIdSchema,
});
export const AccountAccessGrantSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  createdAt: Schema.DateFromString,
  invitedUserId: AppUserIdSchema,
  invitedUserImage: Schema.NullOr(Schema.String),
  invitedUserName: Schema.String,
  status: ActiveAccountAccessStatusSchema,
  updatedAt: Schema.DateFromString,
});
