import { Effect } from "effect";

import {
  asMargonemAccountAccessId,
  asMargonemAccountId,
} from "@/features/squad-builder/branded-ids";
import { asAppUserId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

export interface SearchAccountInviteTargetsInput {
  readonly accountId: number;
  readonly query: string;
}

export interface SendAccountAccessInviteInput {
  readonly accountId: number;
  readonly invitedUserId: string;
}

export interface RespondToAccountAccessInviteInput {
  readonly accessId: number;
  readonly response: "accept" | "decline";
}

export interface RevokeAccountAccessInput {
  readonly accessId: number;
}

/** Lists pending account invitations addressed to the authenticated user. */
export const listIncomingAccountInvites = Effect.fn(
  "Web.SquadAccountSharing.listIncomingInvites"
)(function* listIncomingAccountInvitesEffect() {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountSharing.listIncomingAccountInvites({
    payload: {},
  });
});

/** Lists accounts shared with the authenticated user. */
export const listSharedAccounts = Effect.fn(
  "Web.SquadAccountSharing.listSharedAccounts"
)(function* listSharedAccountsEffect() {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountSharing.listSharedAccounts({
    payload: {},
  });
});

/** Lists active access grants for one account owned by the authenticated user. */
export const listAccountAccessGrants = Effect.fn(
  "Web.SquadAccountSharing.listAccessGrants"
)(function* listAccountAccessGrantsEffect(accountId: number) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountSharing.listAccountAccessGrants({
    payload: { accountId: yield* asMargonemAccountId(accountId) },
  });
});

/** Searches verified users who can receive access to one owned account. */
export const searchAccountInviteTargets = Effect.fn(
  "Web.SquadAccountSharing.searchInviteTargets"
)(function* searchAccountInviteTargetsEffect(
  input: SearchAccountInviteTargetsInput
) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountSharing.searchAccountInviteTargets({
    payload: {
      accountId: yield* asMargonemAccountId(input.accountId),
      query: input.query,
    },
  });
});

/** Sends an account access invitation. */
export const sendAccountAccessInvite = Effect.fn(
  "Web.SquadAccountSharing.sendInvite"
)(function* sendAccountAccessInviteEffect(input: SendAccountAccessInviteInput) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountSharing.sendAccountAccessInvite({
    payload: {
      accountId: yield* asMargonemAccountId(input.accountId),
      invitedUserId: yield* asAppUserId(input.invitedUserId),
    },
  });
});

/** Accepts or declines an incoming account access invitation. */
export const respondToAccountAccessInvite = Effect.fn(
  "Web.SquadAccountSharing.respondToInvite"
)(function* respondToAccountAccessInviteEffect(
  input: RespondToAccountAccessInviteInput
) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountSharing.respondToAccountAccessInvite({
    payload: {
      accessId: yield* asMargonemAccountAccessId(input.accessId),
      response: input.response,
    },
  });
});

/** Revokes an account access grant or pending invitation. */
export const revokeAccountAccess = Effect.fn(
  "Web.SquadAccountSharing.revokeAccess"
)(function* revokeAccountAccessEffect(input: RevokeAccountAccessInput) {
  const client = yield* AppHttpApiClient;
  return yield* client.squadBuilderAccountSharing.revokeAccountAccess({
    payload: {
      accessId: yield* asMargonemAccountAccessId(input.accessId),
    },
  });
});

/** Runs account-sharing API effects through the application HTTP client. */
export type AccountSharingApiRunner = typeof runAppHttpApi;
