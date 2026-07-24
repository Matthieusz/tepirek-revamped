import * as Effect from "effect/Effect";

import type { SquadBuilderStoreServiceShape } from "../../services/squad-builder/squad-groups/squad-group-store.ts";

const unhandledStoreCall = (operation: keyof SquadBuilderStoreServiceShape) =>
  Effect.die(new Error(`Unexpected SquadGroupStoreService.${operation} call`));

/** Build an Effect squad-group store test service with explicit operation overrides. */
const makeEffectStoreTestService = (
  overrides: Partial<SquadBuilderStoreServiceShape>
): SquadBuilderStoreServiceShape => ({
  applyRefetchedAccount: () => unhandledStoreCall("applyRefetchedAccount"),
  authorizeSquadGroupOwner: () =>
    unhandledStoreCall("authorizeSquadGroupOwner"),
  createOwnedAccountFromPendingImport: () =>
    unhandledStoreCall("createOwnedAccountFromPendingImport"),
  createPendingImport: () => unhandledStoreCall("createPendingImport"),
  createPendingRefetch: () => unhandledStoreCall("createPendingRefetch"),
  createSquadGroup: () => unhandledStoreCall("createSquadGroup"),
  deleteOwnedAccount: () => unhandledStoreCall("deleteOwnedAccount"),
  deleteSquadGroup: () => unhandledStoreCall("deleteSquadGroup"),
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
  updateOwnedAccountDisplayName: () =>
    unhandledStoreCall("updateOwnedAccountDisplayName"),
  upsertAccountAccessInvite: () =>
    unhandledStoreCall("upsertAccountAccessInvite"),
  upsertSquadGroupEditorInvite: () =>
    unhandledStoreCall("upsertSquadGroupEditorInvite"),
  ...overrides,
});

export const makeSquadGroupStoreServiceTestService = makeEffectStoreTestService;
export const makeAccountImportStoreServiceTestService =
  makeEffectStoreTestService;
export const makeAccountRefetchStoreServiceTestService =
  makeEffectStoreTestService;
export const makeAccountSharingStoreServiceTestService =
  makeEffectStoreTestService;
