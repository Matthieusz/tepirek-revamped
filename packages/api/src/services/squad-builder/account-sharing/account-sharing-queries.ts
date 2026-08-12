import * as Effect from "effect/Effect";

import { AccountSharingStoreService } from "./account-sharing-store.ts";

/** List incoming account invitations through the account-sharing use case. */
export const listIncomingAccountInvites = Effect.fn(
  "AccountSharing.listIncomingInvites"
)(function* listIncomingAccountInvites(
  input: Parameters<
    (typeof AccountSharingStoreService.Service)["listIncomingAccountInvites"]
  >[0]
) {
  const store = yield* AccountSharingStoreService;
  return yield* store.listIncomingAccountInvites(input);
});

/** List accounts shared with the current application user. */
export const listSharedAccounts = Effect.fn(
  "AccountSharing.listSharedAccounts"
)(function* listSharedAccounts(
  input: Parameters<
    (typeof AccountSharingStoreService.Service)["listSharedAccounts"]
  >[0]
) {
  const store = yield* AccountSharingStoreService;
  return yield* store.listSharedAccounts(input);
});
