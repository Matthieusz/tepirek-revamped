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
    authorizeSquadGroupOwner: () =>
      unhandledStoreCall("authorizeSquadGroupOwner"),
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
    findVerifiedSquadEditorInviteTarget: () =>
      unhandledStoreCall("findVerifiedSquadEditorInviteTarget"),
    getAccountForRefetch: () => unhandledStoreCall("getAccountForRefetch"),
    getSquadGroupDetail: () => unhandledStoreCall("getSquadGroupDetail"),
    listAccountAccessGrants: () =>
      unhandledStoreCall("listAccountAccessGrants"),
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
    respondToSquadGroupInvite: () =>
      unhandledStoreCall("respondToSquadGroupInvite"),
    revokeAccountAccess: () => unhandledStoreCall("revokeAccountAccess"),
    revokeSquadGroupEditor: () => unhandledStoreCall("revokeSquadGroupEditor"),
    saveSharedSquadGroupCharacters: () =>
      unhandledStoreCall("saveSharedSquadGroupCharacters"),
    saveSquadGroupSnapshot: () => unhandledStoreCall("saveSquadGroupSnapshot"),
    searchInviteTargets: () => unhandledStoreCall("searchInviteTargets"),
    searchSquadEditorInviteTargets: () =>
      unhandledStoreCall("searchSquadEditorInviteTargets"),
    setSquadGroupVisibility: () =>
      unhandledStoreCall("setSquadGroupVisibility"),
    upsertAccountAccessInvite: () =>
      unhandledStoreCall("upsertAccountAccessInvite"),
    upsertSquadGroupEditorInvite: () =>
      unhandledStoreCall("upsertSquadGroupEditorInvite"),
    ...overrides,
  });
