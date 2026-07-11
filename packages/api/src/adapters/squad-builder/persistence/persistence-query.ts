import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.js";
import { EffectSquadBuilderPersistenceUnavailable } from "../../../services/squad-builder/squad-groups/squad-group-errors.js";

export type EffectSquadGroupPersistenceOperation =
  | "applyRefetchedAccount"
  | "authorizeSquadGroupOwner"
  | "createPendingImport"
  | "createOwnedAccountFromPendingImport"
  | "createPendingRefetch"
  | "createSquadGroup"
  | "findOwnedAccountForSharing"
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
  | "setSquadGroupVisibility";

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
    new EffectSquadBuilderPersistenceUnavailable({
      cause,
      operation,
      provider: "postgres",
    })
  );

// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params
export const persistenceQuery = <A, E, R>(
  operation: EffectSquadGroupPersistenceOperation,
  self: Effect.Effect<A, E, R>
): Effect.Effect<A, EffectSquadBuilderPersistenceUnavailable, R> =>
  Effect.catch(self, (error) => failPersistence(operation, error));
// oxlint-enable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params

/** Preserve a query's typed Drizzle failure and environment inside a transaction. */
export const persistenceQueryUnsafe = <A, E, R>(
  self: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => self;

// oxlint-disable promise/prefer-await-to-callbacks
export const parsePersistedAppUserId = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
): Effect.Effect<AppUserId, EffectSquadBuilderPersistenceUnavailable, never> =>
  parseAppUserId(value).pipe(
    Effect.catchTag("InvalidAppUserId", (error) =>
      failPersistence(operation, error)
    )
  );
// oxlint-enable promise/prefer-await-to-callbacks

export const namedStoreMethod = <Input, A, E, R>(
  name: string,
  method: (input: Input) => Effect.Effect<A, E, R>
): ((input: Input) => Effect.Effect<A, E, R>) =>
  Effect.fn(name)(function* namedStoreMethodEffect(input: Input) {
    return yield* method(input);
  });

// oxlint-disable promise/prefer-await-to-callbacks
export const parsePersistedSquadGroupName = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
) =>
  parseSquadGroupName(value).pipe(
    Effect.mapError(
      (error) =>
        new EffectSquadBuilderPersistenceUnavailable({
          cause: error,
          operation,
          provider: "postgres",
        })
    )
  );
// oxlint-enable promise/prefer-await-to-callbacks
