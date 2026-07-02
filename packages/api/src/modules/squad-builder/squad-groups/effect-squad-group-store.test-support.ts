import * as Effect from "effect/Effect";

import type { EffectSquadBuilderStoreShape } from "./squad-group-store.js";

const unhandledStoreCall = (operation: keyof EffectSquadBuilderStoreShape) =>
  Effect.die(new Error(`Unexpected EffectSquadGroupStore.${operation} call`));

/** Build an Effect squad-group store test service with explicit operation overrides. */
const makeEffectStoreTestService = (
  overrides: Partial<EffectSquadBuilderStoreShape>
): EffectSquadBuilderStoreShape => ({
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
  getPendingSquadGroupInviteCount: () =>
    unhandledStoreCall("getPendingSquadGroupInviteCount"),
  getSquadGroupDetail: () => unhandledStoreCall("getSquadGroupDetail"),
  listAccountAccessGrants: () => unhandledStoreCall("listAccountAccessGrants"),
  listAvailableCharactersForOwner: () =>
    unhandledStoreCall("listAvailableCharactersForOwner"),
  listGlobalSquadGroups: () => unhandledStoreCall("listGlobalSquadGroups"),
  listIncomingAccountInvites: () =>
    unhandledStoreCall("listIncomingAccountInvites"),
  listIncomingSquadGroupInvites: () =>
    unhandledStoreCall("listIncomingSquadGroupInvites"),
  listMySquadGroups: () => unhandledStoreCall("listMySquadGroups"),
  listOwnedAccounts: () => unhandledStoreCall("listOwnedAccounts"),
  listSharedAccounts: () => unhandledStoreCall("listSharedAccounts"),
  listSharedSquadGroups: () => unhandledStoreCall("listSharedSquadGroups"),
  listSquadGroupEditorGrants: () =>
    unhandledStoreCall("listSquadGroupEditorGrants"),
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
  setSquadGroupVisibility: () => unhandledStoreCall("setSquadGroupVisibility"),
  upsertAccountAccessInvite: () =>
    unhandledStoreCall("upsertAccountAccessInvite"),
  upsertSquadGroupEditorInvite: () =>
    unhandledStoreCall("upsertSquadGroupEditorInvite"),
  ...overrides,
});

export const makeEffectSquadGroupStoreTestService = makeEffectStoreTestService;
export const makeEffectAccountImportStoreTestService =
  makeEffectStoreTestService;
export const makeEffectAccountRefetchStoreTestService =
  makeEffectStoreTestService;
export const makeEffectAccountSharingStoreTestService =
  makeEffectStoreTestService;
