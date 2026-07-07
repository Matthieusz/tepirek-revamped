/* eslint-disable max-classes-per-file -- Contract-only tagged error schemas are collocated with endpoint definitions. */
import * as Schema from "effect/Schema";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

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
} from "./account-sharing-schema.js";

export class SquadBuilderUnauthorized extends Schema.TaggedErrorClass<SquadBuilderUnauthorized>()(
  "SquadBuilderUnauthorized",
  { message: Schema.String },
  { httpApiStatus: 401 }
) {}

export class SquadBuilderForbidden extends Schema.TaggedErrorClass<SquadBuilderForbidden>()(
  "SquadBuilderForbidden",
  { message: Schema.String },
  { httpApiStatus: 403 }
) {}

export class SquadBuilderNotFound extends Schema.TaggedErrorClass<SquadBuilderNotFound>()(
  "SquadBuilderNotFound",
  { message: Schema.String },
  { httpApiStatus: 404 }
) {}

export class SquadBuilderConflict extends Schema.TaggedErrorClass<SquadBuilderConflict>()(
  "SquadBuilderConflict",
  { message: Schema.String },
  { httpApiStatus: 409 }
) {}

export class SquadBuilderInvalidInput extends Schema.TaggedErrorClass<SquadBuilderInvalidInput>()(
  "SquadBuilderInvalidInput",
  { message: Schema.String },
  { httpApiStatus: 400 }
) {}

export class SquadBuilderPersistenceUnavailable extends Schema.TaggedErrorClass<SquadBuilderPersistenceUnavailable>()(
  "SquadBuilderPersistenceUnavailable",
  { cause: Schema.Defect(), operation: Schema.String },
  { httpApiStatus: 503 }
) {}

export const SquadBuilderAccountSharingError = Schema.Union([
  SquadBuilderUnauthorized,
  SquadBuilderForbidden,
  SquadBuilderNotFound,
  SquadBuilderConflict,
  SquadBuilderInvalidInput,
  SquadBuilderPersistenceUnavailable,
]);

export const SquadBuilderAccountSharingGroup = HttpApiGroup.make(
  "squadBuilderAccountSharing"
)
  .add(
    HttpApiEndpoint.post(
      "searchAccountInviteTargets",
      "/invite-targets/search",
      {
        error: SquadBuilderAccountSharingError,
        payload: SearchAccountInviteTargetsPayload,
        success: Schema.Array(AccountInviteTargetSchema),
      }
    ),
    HttpApiEndpoint.post("sendAccountAccessInvite", "/invites", {
      error: SquadBuilderAccountSharingError,
      payload: SendAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("respondToAccountAccessInvite", "/invites/respond", {
      error: SquadBuilderAccountSharingError,
      payload: RespondToAccountAccessInvitePayload,
      success: AccountAccessInviteSummarySchema,
    }),
    HttpApiEndpoint.post("revokeAccountAccess", "/access/revoke", {
      error: SquadBuilderAccountSharingError,
      payload: RevokeAccountAccessPayload,
      success: RevokeAccountAccessSuccess,
    }),
    HttpApiEndpoint.post("listIncomingAccountInvites", "/incoming-invites", {
      error: SquadBuilderAccountSharingError,
      payload: Schema.Struct({}),
      success: Schema.Array(AccountAccessInviteSummarySchema),
    }),
    HttpApiEndpoint.post("listSharedAccounts", "/shared-accounts", {
      error: SquadBuilderAccountSharingError,
      payload: Schema.Struct({}),
      success: Schema.Array(SharedMargonemAccountSummarySchema),
    }),
    HttpApiEndpoint.post("listAccountAccessGrants", "/access-grants", {
      error: SquadBuilderAccountSharingError,
      payload: AccountAccessGrantsPayload,
      success: Schema.Array(AccountAccessGrantSummarySchema),
    })
  )
  .prefix("/squad-builder/account-sharing");
