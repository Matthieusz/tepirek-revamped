import * as Schema from "effect/Schema";

import {
  AccountAccessStatusSchema,
  ActiveAccountAccessStatusSchema,
} from "../../../modules/squad-builder/account-access-status.js";
import { AppUserIdSchema } from "../../../modules/squad-builder/app-user-id.js";
import { MargonemAccountAccessIdSchema } from "../../../modules/squad-builder/margonem-account-access-id.js";
import { MargonemAccountIdSchema } from "../../../modules/squad-builder/margonem-account-id.js";
import { MargonemProfileIdSchema } from "../../../modules/squad-builder/margonem-profile-id.js";

/** HTTP/API schema for an invite response command. */
export const InviteResponseSchema = Schema.Literals(["accept", "decline"]);

export const AccountInviteTargetSchema = Schema.Struct({
  image: Schema.NullOr(Schema.String),
  name: Schema.String,
  userId: AppUserIdSchema,
});
export const SearchAccountInviteTargetsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  actorUserId: AppUserIdSchema,
  query: Schema.String,
});
export const SendAccountAccessInvitePayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  actorUserId: AppUserIdSchema,
  invitedUserId: AppUserIdSchema,
});
export const AccountAccessInviteSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  accountDisplayName: Schema.String,
  accountId: MargonemAccountIdSchema,
  createdAt: Schema.Date,
  generatedProfileUrl: Schema.String,
  invitedUserId: AppUserIdSchema,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  status: AccountAccessStatusSchema,
  updatedAt: Schema.Date,
});
export const RespondToAccountAccessInvitePayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  actorUserId: AppUserIdSchema,
  response: InviteResponseSchema,
});
export const RevokeAccountAccessPayload = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  actorUserId: AppUserIdSchema,
});
export const RevokeAccountAccessSuccess = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  accountId: MargonemAccountIdSchema,
  removedSquadCharacterCount: Schema.Number,
  revokedUserId: AppUserIdSchema,
});
export const AccountAccessGrantsPayload = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  actorUserId: AppUserIdSchema,
});
export const SharedMargonemAccountSummarySchema = Schema.Struct({
  accountId: MargonemAccountIdSchema,
  characterCount: Schema.Number,
  displayName: Schema.String,
  generatedProfileUrl: Schema.String,
  lastFetchedAt: Schema.Date,
  ownerUserId: AppUserIdSchema,
  ownerUserImage: Schema.NullOr(Schema.String),
  ownerUserName: Schema.String,
  profileId: MargonemProfileIdSchema,
});
export const AccountAccessGrantSummarySchema = Schema.Struct({
  accessId: MargonemAccountAccessIdSchema,
  createdAt: Schema.Date,
  invitedUserId: AppUserIdSchema,
  invitedUserImage: Schema.NullOr(Schema.String),
  invitedUserName: Schema.String,
  status: ActiveAccountAccessStatusSchema,
  updatedAt: Schema.Date,
});
