import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

import {
  SquadBuilderConflict,
  SquadBuilderBaseErrors,
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

export {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
};

export const SquadBuilderAccountSharingError = Schema.Union([
  ...SquadBuilderBaseErrors,
]);

export const SquadBuilderAccountSharingErrors = SquadBuilderBaseErrors;

export const SquadBuilderAccountSharingGroup = HttpApiGroup.make(
  "squadBuilderAccountSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchAccountInviteTargets",
      "/invite-targets/search",
      {
        error: SquadBuilderAccountSharingErrors,
        payload: SearchAccountInviteTargetsPayload,
        success: Schema.Array(AccountInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendAccountAccessInvite", "/invites", {
      error: SquadBuilderAccountSharingErrors,
      payload: SendAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("respondToAccountAccessInvite", "/invites/respond", {
      error: SquadBuilderAccountSharingErrors,
      payload: RespondToAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("revokeAccountAccess", "/access/revoke", {
      error: SquadBuilderAccountSharingErrors,
      payload: RevokeAccountAccessPayload,
      success: RevokeAccountAccessSuccess,
    }),
    HttpApiEndpoint.post("listIncomingAccountInvites", "/incoming-invites", {
      error: SquadBuilderAccountSharingErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(AccountAccessInviteSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedAccounts", "/shared-accounts", {
      error: SquadBuilderAccountSharingErrors,
      payload: Schema.Struct({}),
      success: Schema.Array(SharedMargonemAccountSummarySchema),
    }),
    HttpApiEndpoint.post("listAccountAccessGrants", "/access-grants", {
      error: SquadBuilderAccountSharingErrors,
      payload: AccountAccessGrantsPayload,
      success: Schema.Array(AccountAccessGrantSummarySchema),
    })
  )
  .prefix("/squad-builder/account-sharing");
