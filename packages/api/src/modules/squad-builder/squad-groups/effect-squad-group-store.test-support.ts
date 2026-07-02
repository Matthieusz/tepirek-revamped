import * as Effect from "effect/Effect";

import { EffectSquadGroupStore } from "./squad-group-store";
import type { EffectSquadGroupStoreShape } from "./squad-group-store";

const unhandledStoreCall = (operation: keyof EffectSquadGroupStoreShape) =>
  Effect.die(new Error(`Unexpected EffectSquadGroupStore.${operation} call`));

/** Build an Effect squad-group store test service with explicit operation overrides. */
export const makeEffectSquadGroupStoreTestService = (
  overrides: Partial<EffectSquadGroupStoreShape>
) =>
  EffectSquadGroupStore.of({
    applyRefetchedAccount: () => unhandledStoreCall("applyRefetchedAccount"),
    createOwnedAccountFromPendingImport: () =>
      unhandledStoreCall("createOwnedAccountFromPendingImport"),
    createPendingImport: () => unhandledStoreCall("createPendingImport"),
    createPendingRefetch: () => unhandledStoreCall("createPendingRefetch"),
    createSquadGroup: () => unhandledStoreCall("createSquadGroup"),
    findOwnedAccountForSharing: () =>
      unhandledStoreCall("findOwnedAccountForSharing"),
    findPendingImportForConfirmation: () =>
      unhandledStoreCall("findPendingImportForConfirmation"),
    findPendingRefetchForApply: () =>
      unhandledStoreCall("findPendingRefetchForApply"),
    findProfileAccessState: () => unhandledStoreCall("findProfileAccessState"),
    findVerifiedInviteTarget: () =>
      unhandledStoreCall("findVerifiedInviteTarget"),
    getAccountForRefetch: () => unhandledStoreCall("getAccountForRefetch"),
    getSquadGroupDetail: () => unhandledStoreCall("getSquadGroupDetail"),
    listAvailableCharactersForOwner: () =>
      unhandledStoreCall("listAvailableCharactersForOwner"),
    listGlobalSquadGroups: () => unhandledStoreCall("listGlobalSquadGroups"),
    listIncomingAccountInvites: () =>
      unhandledStoreCall("listIncomingAccountInvites"),
    listMySquadGroups: () => unhandledStoreCall("listMySquadGroups"),
    listOwnedAccounts: () => unhandledStoreCall("listOwnedAccounts"),
    listSharedAccounts: () => unhandledStoreCall("listSharedAccounts"),
    markPendingRefetchApplied: () =>
      unhandledStoreCall("markPendingRefetchApplied"),
    markRequestFailed: () => unhandledStoreCall("markRequestFailed"),
    markRequestSucceeded: () => unhandledStoreCall("markRequestSucceeded"),
    reserveRequest: () => unhandledStoreCall("reserveRequest"),
    respondToAccountAccessInvite: () =>
      unhandledStoreCall("respondToAccountAccessInvite"),
    revokeAccountAccess: () => unhandledStoreCall("revokeAccountAccess"),
    searchInviteTargets: () => unhandledStoreCall("searchInviteTargets"),
    setSquadGroupVisibility: () =>
      unhandledStoreCall("setSquadGroupVisibility"),
    upsertAccountAccessInvite: () =>
      unhandledStoreCall("upsertAccountAccessInvite"),
    ...overrides,
  });
