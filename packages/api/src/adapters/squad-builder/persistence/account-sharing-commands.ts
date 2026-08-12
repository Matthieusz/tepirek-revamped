import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import {
  margonemAccount,
  margonemAccountAccess,
  margonemCharacter,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, eq, inArray } from "drizzle-orm";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";

import type { AccountAccessStatus } from "../../../domain/squad-builder/account-access-status.ts";
import { parseAccountAccessStatus } from "../../../domain/squad-builder/account-access-status.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import type {
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessStoreInput,
} from "../../../services/squad-builder/account-sharing/account-sharing-store.ts";
import {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorDoesNotOwnMargonemAccount,
  ActorIsNotInviteRecipient,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import { loadAccountAccessInviteSummaryWithDatabase } from "./account-sharing-projections.ts";
import { validateInvitationAccessTransition } from "./invitation-access-lifecycle.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  persistenceQuery,
} from "./persistence-query.ts";

/** Create or re-send an account-access invitation atomically. */
export const upsertAccountAccessInviteWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* upsertAccountAccessInviteEffect({
    accountId,
    invitedUserId,
    now,
    ownerUserId,
  }: {
    readonly accountId: MargonemAccountId;
    readonly ownerUserId: AppUserId;
    readonly invitedUserId: AppUserId;
    readonly now: Date;
  }) {
    const operation = "upsertAccountAccessInvite" as const;
    const accountIdNumber = accountId;
    const invitedUser = invitedUserId;
    const owner = ownerUserId;
    const transaction = database.transaction(
      Effect.fnUntraced(function* upsertAccountAccessInviteTransaction(
        tx: TransactionDatabase
      ) {
        const insert = tx
          .insert(margonemAccountAccess)
          .values({
            accountId: accountIdNumber,
            invitedByUserId: owner,
            status: "pending",
            userId: invitedUser,
          })
          .onConflictDoNothing({
            target: [
              margonemAccountAccess.accountId,
              margonemAccountAccess.userId,
            ],
          })
          .returning({ id: margonemAccountAccess.id });
        const insertedRows = yield* insert;

        const [inserted] = insertedRows;

        if (inserted !== undefined) {
          return inserted.id;
        }

        const existingSelect = tx
          .select({
            id: margonemAccountAccess.id,
            status: margonemAccountAccess.status,
          })
          .from(margonemAccountAccess)
          .where(
            and(
              eq(margonemAccountAccess.accountId, accountIdNumber),
              eq(margonemAccountAccess.userId, invitedUser)
            )
          )
          .limit(1)
          .for("update");
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to load conflicting account access invite")
          );
        }

        const transitioned = yield* validateInvitationAccessTransition({
          currentStatus: existing.status,
          nextStatus: "pending",
          onTransitionNotAllowed: ({ attempted, currentStatus }) =>
            new AccountAccessTransitionNotAllowed({
              attempted,
              currentStatus,
            }),
          parseStatus: (value) =>
            parseAccountAccessStatus(value).pipe(
              Effect.catch((error) => failPersistence(operation, error))
            ),
        });
        const updatedRows = yield* tx
          .update(margonemAccountAccess)
          .set({
            invitedByUserId: owner,
            status: transitioned.nextStatus,
            updatedAt: now,
          })
          .where(eq(margonemAccountAccess.id, existing.id))
          .returning({ id: margonemAccountAccess.id });
        const [updated] = updatedRows;

        if (updated === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to re-send account access invite")
          );
        }

        return updated.id;
      })
    );
    const upserted = yield* persistenceQuery(operation, transaction);

    const accessId = yield* parseMargonemAccountAccessId(upserted).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const summary = yield* loadAccountAccessInviteSummaryWithDatabase(database)(
      accessId,
      operation
    ).pipe(
      Effect.catchTag("AccountAccessInviteNotFound", (error) =>
        failPersistence(operation, error)
      )
    );

    return summary;
  });

/** Accept or decline an account-access invitation atomically. */
export const respondToAccountAccessInviteWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* respondToAccountAccessInviteEffect({
    accessId,
    invitedUserId,
    now,
    response,
  }: RespondToAccountAccessInviteStoreInput) {
    const operation = "respondToAccountAccessInvite" as const;
    const invitedUser = invitedUserId;
    const transaction = database.transaction(
      Effect.fnUntraced(function* respondToAccountAccessInviteTransaction(
        tx: TransactionDatabase
      ) {
        const existingSelect = tx
          .select({
            id: margonemAccountAccess.id,
            status: margonemAccountAccess.status,
            userId: margonemAccountAccess.userId,
          })
          .from(margonemAccountAccess)
          .where(eq(margonemAccountAccess.id, accessId))
          .limit(1)
          .for("update");
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          return new AccountAccessInviteNotFound();
        }

        if (existing.userId !== invitedUser) {
          return new ActorIsNotInviteRecipient();
        }

        const nextStatus: AccountAccessStatus =
          response === "accept" ? "accepted" : "declined";

        const transitioned = yield* validateInvitationAccessTransition({
          currentStatus: existing.status,
          nextStatus,
          onTransitionNotAllowed: ({ attempted, currentStatus }) =>
            new AccountAccessTransitionNotAllowed({
              attempted,
              currentStatus,
            }),
          parseStatus: (value) =>
            parseAccountAccessStatus(value).pipe(
              Effect.catch((error) => failPersistence(operation, error))
            ),
        });
        const updatedRows = yield* tx
          .update(margonemAccountAccess)
          .set({ status: transitioned.nextStatus, updatedAt: now })
          .where(eq(margonemAccountAccess.id, existing.id))
          .returning({ id: margonemAccountAccess.id });
        const [updated] = updatedRows;

        if (updated === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to update account access invite")
          );
        }

        return { _tag: "Updated" as const };
      })
    );
    const respond = yield* persistenceQuery(operation, transaction);

    if (respond._tag !== "Updated") {
      return yield* respond;
    }

    return yield* loadAccountAccessInviteSummaryWithDatabase(database)(
      accessId,
      operation
    );
  });

/** Revoke account access and remove affected squad placements. */
export const revokeAccountAccessWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* revokeAccountAccessEffect({
    accessId,
    now,
    ownerUserId,
  }: RevokeAccountAccessStoreInput) {
    const operation = "revokeAccountAccess" as const;
    const accessIdNumber = accessId;
    const owner = ownerUserId;
    const transaction = database.transaction(
      Effect.fnUntraced(function* revokeAccountAccessTransaction(
        tx: TransactionDatabase
      ) {
        const accessSelect = tx
          .select({
            accountId: margonemAccountAccess.accountId,
            status: margonemAccountAccess.status,
            userId: margonemAccountAccess.userId,
          })
          .from(margonemAccountAccess)
          .where(eq(margonemAccountAccess.id, accessIdNumber))
          .limit(1)
          .for("update");
        const accessRows = yield* accessSelect;

        const [access] = accessRows;

        if (access === undefined) {
          return new AccountAccessInviteNotFound();
        }

        const accountSelect = tx
          .select({ ownerUserId: margonemAccount.ownerUserId })
          .from(margonemAccount)
          .where(eq(margonemAccount.id, access.accountId))
          .limit(1);
        const accountRows = yield* accountSelect;

        const [account] = accountRows;

        if (account === undefined) {
          return new AccountAccessInviteNotFound();
        }

        if (account.ownerUserId !== owner) {
          return new ActorDoesNotOwnMargonemAccount();
        }

        const transitioned = yield* validateInvitationAccessTransition({
          currentStatus: access.status,
          nextStatus: "revoked",
          onTransitionNotAllowed: ({ attempted, currentStatus }) =>
            new AccountAccessTransitionNotAllowed({
              attempted,
              currentStatus,
            }),
          parseStatus: (value) =>
            parseAccountAccessStatus(value).pipe(
              Effect.catch((error) => failPersistence(operation, error))
            ),
        });
        yield* tx
          .update(margonemAccountAccess)
          .set({ status: transitioned.nextStatus, updatedAt: now })
          .where(eq(margonemAccountAccess.id, accessIdNumber));

        let removedSquadCharacterCount = 0;

        if (transitioned.previousStatus === "accepted") {
          const characterSelect = tx
            .select({ id: margonemCharacter.id })
            .from(margonemCharacter)
            .where(eq(margonemCharacter.accountId, access.accountId));
          const accountCharacters = yield* characterSelect;

          const accountCharacterIds = accountCharacters.map(
            (character) => character.id
          );

          if (accountCharacterIds.length > 0) {
            const affectedGroupSelect = tx
              .select({ groupId: squadCharacter.squadGroupId })
              .from(squadCharacter)
              .innerJoin(
                squadGroup,
                eq(squadGroup.id, squadCharacter.squadGroupId)
              )
              .where(
                and(
                  inArray(squadCharacter.characterId, accountCharacterIds),
                  eq(squadGroup.ownerUserId, access.userId)
                )
              );
            const affectedGroups = yield* affectedGroupSelect;

            const affectedGroupIds = Arr.dedupe(
              affectedGroups.map((group) => group.groupId)
            );

            if (affectedGroupIds.length > 0) {
              const removedPlacementsDelete = tx
                .delete(squadCharacter)
                .where(
                  and(
                    inArray(squadCharacter.characterId, accountCharacterIds),
                    inArray(squadCharacter.squadGroupId, affectedGroupIds)
                  )
                )
                .returning({ id: squadCharacter.id });
              const removedPlacements = yield* removedPlacementsDelete;

              removedSquadCharacterCount = removedPlacements.length;

              yield* tx
                .update(squadGroup)
                .set({ updatedAt: now })
                .where(inArray(squadGroup.id, affectedGroupIds));
            }
          }
        }

        return {
          _tag: "Revoked" as const,
          accountId: access.accountId,
          removedSquadCharacterCount,
          revokedUserId: access.userId,
        };
      })
    );
    const revoked = yield* persistenceQuery(operation, transaction);

    if (revoked._tag !== "Revoked") {
      return yield* revoked;
    }

    const accountId = yield* parseMargonemAccountId(revoked.accountId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const revokedUserId = yield* parsePersistedAppUserId(
      operation,
      revoked.revokedUserId
    );

    return {
      accessId,
      accountId,
      removedSquadCharacterCount: revoked.removedSquadCharacterCount,
      revokedUserId,
    };
  });
