import * as Effect from "effect/Effect";

import type { AppUserId } from "../app-user-id.js";
import { parseAppUserId } from "../app-user-id.js";
import { isFailure } from "../outcome.js";
import { EffectSquadBuilderPersistenceUnavailable } from "../squad-groups/squad-group-errors.js";
import { parseSquadGroupName } from "../squad-name.js";

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
export const persistenceQuery = <A>(
  operation: EffectSquadGroupPersistenceOperation,
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, EffectSquadBuilderPersistenceUnavailable, never> =>
  // SAFETY: The second type parameter of the incoming Effect is widened to
  // `unknown` by Drizzle's query builder but the actual runtime error type is
  // always `never` (Drizzle throws, not returns typed errors). The cast
  // narrows it so `Effect.catch` can catch any thrown error and rewrap it as
  // `EffectSquadBuilderPersistenceUnavailable`.
  Effect.catch(self as Effect.Effect<A, unknown, never>, (error) =>
    failPersistence(operation, error)
  );
// oxlint-enable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params

// SAFETY: Same rationale as persistenceQuery — Drizzle query effects carry
// `unknown` error type but never produce typed failures at runtime. The cast
// erases the error parameter so callers can self-assemble their error type in
// the gen block without false positive type mismatches.
export const persistenceQueryUnsafe = <A>(
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, unknown, never> => self as Effect.Effect<A, unknown, never>;

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

export const parsePersistedSquadGroupName = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
) => {
  const name = parseSquadGroupName(value);

  if (isFailure(name)) {
    return failPersistence(operation, name.error);
  }

  return Effect.succeed(name.value);
};
