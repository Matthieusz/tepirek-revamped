import * as Effect from "effect/Effect";

import type { AccountImportStoreService } from "../../services/squad-builder/account-import/account-import-store.ts";
import type { AccountRefetchStoreService } from "../../services/squad-builder/account-refetch/account-refetch-store.ts";
import type { AccountSharingStoreService } from "../../services/squad-builder/account-sharing/account-sharing-store.ts";
import type { FirecrawlRequestAccountingStoreService } from "../../services/squad-builder/firecrawl-request-accounting-store.ts";
import type { SquadGroupDirectoryStoreService } from "../../services/squad-builder/squad-groups/squad-group-directory-store.ts";
import type { SquadGroupSharingStoreService } from "../../services/squad-builder/squad-groups/squad-group-sharing-store.ts";

const missingStoreOperation = (serviceName: string, operation: string) => () =>
  Effect.die(new Error(`Unexpected ${serviceName}.${operation} call`));

/** Build a directory store test service with explicit operation overrides. */
export const makeSquadGroupDirectoryStoreServiceTestService = (
  overrides: Partial<typeof SquadGroupDirectoryStoreService.Service>
): typeof SquadGroupDirectoryStoreService.Service => ({
  findVerifiedSquadEditorInviteTarget: missingStoreOperation(
    "SquadGroupDirectoryStoreService",
    "findVerifiedSquadEditorInviteTarget"
  ),
  listAvailableCharactersForOwner: missingStoreOperation(
    "SquadGroupDirectoryStoreService",
    "listAvailableCharactersForOwner"
  ),
  listGlobalSquadGroups: missingStoreOperation(
    "SquadGroupDirectoryStoreService",
    "listGlobalSquadGroups"
  ),
  searchSquadEditorInviteTargets: missingStoreOperation(
    "SquadGroupDirectoryStoreService",
    "searchSquadEditorInviteTargets"
  ),
  ...overrides,
});

/** Build a sharing store test service with explicit operation overrides. */
export const makeSquadGroupSharingStoreServiceTestService = (
  overrides: Partial<typeof SquadGroupSharingStoreService.Service>
): typeof SquadGroupSharingStoreService.Service => ({
  authorizeSquadGroupOwner: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "authorizeSquadGroupOwner"
  ),
  getPendingSquadGroupInviteCount: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "getPendingSquadGroupInviteCount"
  ),
  listIncomingSquadGroupInvites: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "listIncomingSquadGroupInvites"
  ),
  listSharedSquadGroups: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "listSharedSquadGroups"
  ),
  listSquadGroupEditorGrants: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "listSquadGroupEditorGrants"
  ),
  respondToSquadGroupInvite: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "respondToSquadGroupInvite"
  ),
  revokeSquadGroupEditor: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "revokeSquadGroupEditor"
  ),
  saveSharedSquadGroupCharacters: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "saveSharedSquadGroupCharacters"
  ),
  upsertSquadGroupEditorInvite: missingStoreOperation(
    "SquadGroupSharingStoreService",
    "upsertSquadGroupEditorInvite"
  ),
  ...overrides,
});

/** Build an account-import store test service with explicit operation overrides. */
export const makeAccountImportStoreServiceTestService = (
  overrides: Partial<typeof AccountImportStoreService.Service>
): typeof AccountImportStoreService.Service => ({
  confirmPendingImport: missingStoreOperation(
    "AccountImportStoreService",
    "confirmPendingImport"
  ),
  createPendingImport: missingStoreOperation(
    "AccountImportStoreService",
    "createPendingImport"
  ),
  deleteOwnedAccount: missingStoreOperation(
    "AccountImportStoreService",
    "deleteOwnedAccount"
  ),
  findProfileAccessState: missingStoreOperation(
    "AccountImportStoreService",
    "findProfileAccessState"
  ),
  listOwnedAccounts: missingStoreOperation(
    "AccountImportStoreService",
    "listOwnedAccounts"
  ),
  updateOwnedAccountDisplayName: missingStoreOperation(
    "AccountImportStoreService",
    "updateOwnedAccountDisplayName"
  ),
  ...overrides,
});

/** Build an account-refetch store test service with explicit operation overrides. */
export const makeAccountRefetchStoreServiceTestService = (
  overrides: Partial<typeof AccountRefetchStoreService.Service>
): typeof AccountRefetchStoreService.Service => ({
  applyPendingRefetch: missingStoreOperation(
    "AccountRefetchStoreService",
    "applyPendingRefetch"
  ),
  createPendingRefetch: missingStoreOperation(
    "AccountRefetchStoreService",
    "createPendingRefetch"
  ),
  getAccountForRefetch: missingStoreOperation(
    "AccountRefetchStoreService",
    "getAccountForRefetch"
  ),
  ...overrides,
});

/** Build a Firecrawl request-accounting test service with explicit operation overrides. */
export const makeFirecrawlRequestAccountingStoreServiceTestService = (
  overrides: Partial<typeof FirecrawlRequestAccountingStoreService.Service>
): typeof FirecrawlRequestAccountingStoreService.Service => ({
  markRequestFailed: missingStoreOperation(
    "FirecrawlRequestAccountingStoreService",
    "markRequestFailed"
  ),
  markRequestSucceeded: missingStoreOperation(
    "FirecrawlRequestAccountingStoreService",
    "markRequestSucceeded"
  ),
  reserveRequest: missingStoreOperation(
    "FirecrawlRequestAccountingStoreService",
    "reserveRequest"
  ),
  ...overrides,
});

/** Build an account-sharing store test service with explicit operation overrides. */
export const makeAccountSharingStoreServiceTestService = (
  overrides: Partial<typeof AccountSharingStoreService.Service>
): typeof AccountSharingStoreService.Service => ({
  findAccountOwnerUserId: missingStoreOperation(
    "AccountSharingStoreService",
    "findAccountOwnerUserId"
  ),
  findVerifiedInviteTarget: missingStoreOperation(
    "AccountSharingStoreService",
    "findVerifiedInviteTarget"
  ),
  listAccountAccessGrants: missingStoreOperation(
    "AccountSharingStoreService",
    "listAccountAccessGrants"
  ),
  listIncomingAccountInvites: missingStoreOperation(
    "AccountSharingStoreService",
    "listIncomingAccountInvites"
  ),
  listSharedAccounts: missingStoreOperation(
    "AccountSharingStoreService",
    "listSharedAccounts"
  ),
  respondToAccountAccessInvite: missingStoreOperation(
    "AccountSharingStoreService",
    "respondToAccountAccessInvite"
  ),
  revokeAccountAccess: missingStoreOperation(
    "AccountSharingStoreService",
    "revokeAccountAccess"
  ),
  searchInviteTargets: missingStoreOperation(
    "AccountSharingStoreService",
    "searchInviteTargets"
  ),
  upsertAccountAccessInvite: missingStoreOperation(
    "AccountSharingStoreService",
    "upsertAccountAccessInvite"
  ),
  ...overrides,
});
