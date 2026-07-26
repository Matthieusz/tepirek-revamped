import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
} from "../errors.ts";
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
} from "./account-sharing-schema.ts";

export const SearchAccountInviteTargetsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SendAccountAccessInviteErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
] as const;

export const RespondToAccountAccessInviteErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderPersistenceUnavailable,
] as const;

export const RevokeAccountAccessErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListIncomingAccountInvitesErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListSharedAccountsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderPersistenceUnavailable,
] as const;

export const ListAccountAccessGrantsErrors = [
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
] as const;

export const SquadBuilderAccountSharingGroup = HttpApiGroup.make(
  "squadBuilderAccountSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchAccountInviteTargets",
      "/invite-targets/search",
      {
        error: SearchAccountInviteTargetsErrors,
        payload: SearchAccountInviteTargetsPayload,
        success: Schema.Array(AccountInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendAccountAccessInvite", "/invites", {
      error: SendAccountAccessInviteErrors,
      payload: SendAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("respondToAccountAccessInvite", "/invites/respond", {
      error: RespondToAccountAccessInviteErrors,
      payload: RespondToAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("revokeAccountAccess", "/access/revoke", {
      error: RevokeAccountAccessErrors,
      payload: RevokeAccountAccessPayload,
      success: RevokeAccountAccessSuccess,
    }),
    HttpApiEndpoint.post("listIncomingAccountInvites", "/incoming-invites", {
      error: ListIncomingAccountInvitesErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(AccountAccessInviteSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedAccounts", "/shared-accounts", {
      error: ListSharedAccountsErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(SharedMargonemAccountSummarySchema),
    }),
    HttpApiEndpoint.post("listAccountAccessGrants", "/access-grants", {
      error: ListAccountAccessGrantsErrors,
      payload: AccountAccessGrantsPayload,
      success: Schema.Array(AccountAccessGrantSummarySchema),
    })
  )
  .prefix("/squad-builder/account-sharing");
