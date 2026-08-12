import { EffectDatabase } from "@tepirek-revamped/db/effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AccountSharingStoreService } from "../../../services/squad-builder/account-sharing/account-sharing-store.ts";
import {
  respondToAccountAccessInviteWithDatabase,
  revokeAccountAccessWithDatabase,
  upsertAccountAccessInviteWithDatabase,
} from "./account-sharing-commands.ts";
import {
  findAccountOwnerUserIdWithDatabase,
  findVerifiedInviteTargetWithDatabase,
  listAccountAccessGrantsWithDatabase,
  listIncomingAccountInvitesWithDatabase,
  listSharedAccountsWithDatabase,
  searchInviteTargetsWithDatabase,
} from "./account-sharing-queries.ts";

/** Provide account sharing persistence through the Drizzle database adapter. */
export const DrizzleAccountSharingStoreServiceLayer = Layer.effect(
  AccountSharingStoreService,
  EffectDatabase.useSync((database) =>
    AccountSharingStoreService.of({
      findAccountOwnerUserId: Effect.fn(
        "AccountSharingStore.findAccountOwnerUserId"
      )(findAccountOwnerUserIdWithDatabase(database)),
      findVerifiedInviteTarget: Effect.fn(
        "AccountSharingStore.findVerifiedInviteTarget"
      )(findVerifiedInviteTargetWithDatabase(database)),
      listAccountAccessGrants: Effect.fn(
        "AccountSharingStore.listAccountAccessGrants"
      )(listAccountAccessGrantsWithDatabase(database)),
      listIncomingAccountInvites: Effect.fn(
        "AccountSharingStore.listIncomingAccountInvites"
      )(listIncomingAccountInvitesWithDatabase(database)),
      listSharedAccounts: Effect.fn("AccountSharingStore.listSharedAccounts")(
        listSharedAccountsWithDatabase(database)
      ),
      respondToAccountAccessInvite: Effect.fn(
        "AccountSharingStore.respondToAccountAccessInvite"
      )(respondToAccountAccessInviteWithDatabase(database)),
      revokeAccountAccess: Effect.fn("AccountSharingStore.revokeAccountAccess")(
        revokeAccountAccessWithDatabase(database)
      ),
      searchInviteTargets: Effect.fn("AccountSharingStore.searchInviteTargets")(
        searchInviteTargetsWithDatabase(database)
      ),
      upsertAccountAccessInvite: Effect.fn(
        "AccountSharingStore.upsertAccountAccessInvite"
      )(upsertAccountAccessInviteWithDatabase(database)),
    })
  )
);
