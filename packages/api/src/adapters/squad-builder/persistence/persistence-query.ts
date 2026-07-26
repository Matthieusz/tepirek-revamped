import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import { SquadBuilderPersistenceUnavailable } from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import { makeDirectPersistenceQuery } from "../../persistence-query.ts";

export type EffectSquadGroupPersistenceOperation =
  | "applyRefetchedAccount"
  | "authorizeSquadGroupOwner"
  | "createPendingImport"
  | "createOwnedAccountFromPendingImport"
  | "createPendingRefetch"
  | "createSquadGroup"
  | "deleteOwnedAccount"
  | "deleteSquadGroup"
  | "findAccountOwnerUserId"
  | "findVerifiedInviteTarget"
  | "findVerifiedSquadEditorInviteTarget"
  | "findPendingImportForConfirmation"
  | "findPendingRefetchForApply"
  | "findProfileAccessState"
  | "getAccountForRefetch"
  | "getSquadGroupDetail"
  | "listAvailableCharactersForOwner"
  | "listAccountAccessGrants"
  | "listIncomingSquadGroupInvites"
  | "listGlobalSquadGroups"
  | "getPendingSquadGroupInviteCount"
  | "listIncomingAccountInvites"
  | "listSharedAccounts"
  | "listSharedSquadGroups"
  | "listSquadGroupEditorGrants"
  | "listOwnedAccounts"
  | "listMySquadGroups"
  | "markRequestFailed"
  | "markRequestSucceeded"
  | "markPendingRefetchApplied"
  | "reserveRequest"
  | "respondToAccountAccessInvite"
  | "respondToSquadGroupInvite"
  | "revokeAccountAccess"
  | "revokeSquadGroupEditor"
  | "saveSharedSquadGroupCharacters"
  | "saveSquadGroupSnapshot"
  | "searchSquadEditorInviteTargets"
  | "searchInviteTargets"
  | "upsertAccountAccessInvite"
  | "upsertSquadGroupEditorInvite"
  | "setSquadGroupVisibility"
  | "updateOwnedAccountDisplayName";

export const usedFirecrawlRequestStatuses = [
  "reserved",
  "succeeded",
  "failed",
] as const;

export const escapeLikePattern = (value: string): string =>
  value.replaceAll(/[\\%_]/gu, "\\$&");

export const failPersistence = (
  operation: EffectSquadGroupPersistenceOperation,
  cause: unknown
) =>
  Effect.fail(
    new SquadBuilderPersistenceUnavailable({
      cause,
      operation,
      provider: "postgres",
    })
  );

export const persistenceQuery = makeDirectPersistenceQuery<
  SquadBuilderPersistenceUnavailable,
  EffectSquadGroupPersistenceOperation
>(
  ({ cause, operation }) =>
    new SquadBuilderPersistenceUnavailable({
      cause,
      operation,
      provider: "postgres",
    })
);

// oxlint-disable promise/prefer-await-to-callbacks
export const parsePersistedAppUserId = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
): Effect.Effect<AppUserId, SquadBuilderPersistenceUnavailable, never> =>
  parseAppUserId(value).pipe(
    Effect.catchTag("InvalidAppUserId", (error) =>
      failPersistence(operation, error)
    )
  );
// oxlint-enable promise/prefer-await-to-callbacks

// oxlint-disable promise/prefer-await-to-callbacks
export const parsePersistedSquadGroupName = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
) =>
  parseSquadGroupName(value).pipe(
    Effect.mapError(
      (error) =>
        new SquadBuilderPersistenceUnavailable({
          cause: error,
          operation,
          provider: "postgres",
        })
    )
  );
// oxlint-enable promise/prefer-await-to-callbacks
