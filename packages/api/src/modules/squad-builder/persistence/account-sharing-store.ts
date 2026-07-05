import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  margonemAccount,
  margonemAccountAccess,
  margonemCharacter,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, desc, eq, ilike, inArray, ne, not, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AccountAccessStatus } from "../account-access-status.js";
import {
  canTransitionAccountAccess,
  parseAccountAccessStatus,
} from "../account-access-status.js";
import { parseAccountDisplayName } from "../account-display-name.js";
import { AccountSharingStoreService } from "../account-sharing/account-sharing-store-service.js";
import type { AppUserId } from "../app-user-id.js";
import { appUserIdToString, parseAppUserId } from "../app-user-id.js";
import type { MargonemAccountAccessId } from "../margonem-account-access-id.js";
import {
  margonemAccountAccessIdToNumber,
  parseMargonemAccountAccessId,
} from "../margonem-account-access-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../margonem-account-id.js";
import { parseMargonemProfileId } from "../margonem-profile-id.js";
import { toMargonemProfileUrl } from "../margonem-profile-url.js";
import { isError } from "../result.js";
import type { EffectSquadBuilderPersistenceUnavailable } from "../squad-groups/squad-group-errors.js";
import {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorDoesNotOwnMargonemAccount,
  ActorIsNotInviteRecipient,
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
} from "../squad-groups/squad-group-errors.js";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  FindOwnedAccountForSharingInput,
  ListIncomingAccountInvitesInput,
  ListOwnedMargonemAccountsInput,
  ListSharedAccountsInput,
  OwnedAccountForSharing,
  OwnedMargonemAccountSummary,
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessResult,
  RevokeAccountAccessStoreInput,
  SearchInviteTargetsStoreInput,
  SharedMargonemAccountSummary,
} from "../squad-groups/squad-group-store.js";
import {
  failPersistence,
  namedStoreMethod,
  parsePersistedAppUserId,
  persistenceQuery,
  persistenceQueryUnsafe,
} from "./persistence-query.js";
import type { EffectSquadGroupPersistenceOperation } from "./persistence-query.js";

const listOwnedAccountsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListOwnedMargonemAccountsInput): Effect.Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* listOwnedAccountsEffect() {
      const operation = "listOwnedAccounts" as const;
      const select = database
        .select({
          accountId: margonemAccount.id,
          characterCount: sql<number>`count(${margonemCharacter.id})::int`.as(
            "character_count"
          ),
          createdAt: margonemAccount.createdAt,
          displayName: margonemAccount.displayName,
          lastFetchedAt: margonemAccount.lastFetchedAt,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .leftJoin(
          margonemCharacter,
          eq(margonemCharacter.accountId, margonemAccount.id)
        )
        .where(eq(margonemAccount.ownerUserId, appUserIdToString(actorUserId)))
        .groupBy(margonemAccount.id)
        .orderBy(desc(margonemAccount.createdAt), desc(margonemAccount.id));
      const rows = yield* persistenceQuery(operation, select);

      const accounts: OwnedMargonemAccountSummary[] = [];

      for (const row of rows) {
        const displayName = parseAccountDisplayName(row.displayName);

        if (isError(displayName)) {
          return yield* failPersistence(operation, displayName.error);
        }

        const profileId = parseMargonemProfileId(row.profileId);

        if (isError(profileId)) {
          return yield* failPersistence(operation, profileId.error);
        }

        accounts.push({
          accountId: row.accountId,
          characterCount: row.characterCount ?? 0,
          displayName: displayName.value,
          generatedProfileUrl: toMargonemProfileUrl(profileId.value),
          lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
          profileId: profileId.value,
        });
      }

      return accounts;
    });

const searchInviteTargetsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    actorUserId,
    query,
  }: SearchInviteTargetsStoreInput): Effect.Effect<
    readonly AccountInviteTarget[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* searchInviteTargetsEffect() {
      const operation = "searchInviteTargets" as const;
      const accountIdNumber = margonemAccountIdToNumber(accountId);
      const actor = appUserIdToString(actorUserId);
      const select = database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
        })
        .from(user)
        .where(
          and(
            eq(user.verified, true),
            ne(user.id, actor),
            ilike(user.name, `%${query}%`),
            not(
              sql`${user.id} in (
                select ${margonemAccountAccess.userId}
                from ${margonemAccountAccess}
                where ${margonemAccountAccess.accountId} = ${accountIdNumber}
                  and ${margonemAccountAccess.status} in ('pending', 'accepted')
              )`
            )
          )
        )
        .orderBy(user.name)
        .limit(10);
      const rows = yield* persistenceQuery(operation, select);

      const targets: AccountInviteTarget[] = [];

      for (const row of rows) {
        const userId = parseAppUserId(row.userId);

        if (isError(userId)) {
          return yield* failPersistence(operation, userId.error);
        }

        targets.push({
          image: row.image,
          name: row.name,
          userId: userId.value,
        });
      }

      return targets;
    });

const findOwnedAccountForSharingWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
  }: FindOwnedAccountForSharingInput): Effect.Effect<
    OwnedAccountForSharing,
    MargonemAccountNotFound | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* findOwnedAccountForSharingEffect() {
      const operation = "findOwnedAccountForSharing" as const;
      const select = database
        .select({
          displayName: margonemAccount.displayName,
          ownerUserId: margonemAccount.ownerUserId,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccount)
        .where(eq(margonemAccount.id, margonemAccountIdToNumber(accountId)))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [account] = rows;

      if (account === undefined) {
        return yield* new MargonemAccountNotFound();
      }

      const displayName = parseAccountDisplayName(account.displayName);

      if (isError(displayName)) {
        return yield* failPersistence(operation, displayName.error);
      }

      const ownerUserId = parseAppUserId(account.ownerUserId);

      if (isError(ownerUserId)) {
        return yield* failPersistence(operation, ownerUserId.error);
      }

      const profileId = parseMargonemProfileId(account.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      return {
        accountId,
        displayName: displayName.value,
        ownerUserId: ownerUserId.value,
        profileId: profileId.value,
      };
    });

const loadAccountAccessInviteSummaryWithDatabase =
  (database: EffectPgDatabase) =>
  (
    accessId: MargonemAccountAccessId,
    operation: EffectSquadGroupPersistenceOperation
  ): Effect.Effect<
    AccountAccessInviteSummary,
    AccountAccessInviteNotFound | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* loadAccountAccessInviteSummaryEffect() {
      const select = database
        .select({
          accountDisplayName: margonemAccount.displayName,
          accountId: margonemAccountAccess.accountId,
          createdAt: margonemAccountAccess.createdAt,
          invitedUserId: margonemAccountAccess.userId,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          profileId: margonemAccount.profileId,
          status: margonemAccountAccess.status,
          updatedAt: margonemAccountAccess.updatedAt,
        })
        .from(margonemAccountAccess)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemAccountAccess.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .where(eq(margonemAccountAccess.id, accessId))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [row] = rows;

      if (row === undefined) {
        return yield* new AccountAccessInviteNotFound();
      }

      const status = parseAccountAccessStatus(row.status);

      if (isError(status)) {
        return yield* failPersistence(operation, status.error);
      }

      const accountDisplayName = parseAccountDisplayName(
        row.accountDisplayName
      );

      if (isError(accountDisplayName)) {
        return yield* failPersistence(operation, accountDisplayName.error);
      }

      const accountId = parseMargonemAccountId(row.accountId);

      if (isError(accountId)) {
        return yield* failPersistence(operation, accountId.error);
      }

      const profileId = parseMargonemProfileId(row.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      const invitedUserId = yield* parsePersistedAppUserId(
        operation,
        row.invitedUserId
      );
      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        row.ownerId
      );

      return {
        accessId,
        accountDisplayName: accountDisplayName.value,
        accountId: accountId.value,
        createdAt: row.createdAt,
        generatedProfileUrl: toMargonemProfileUrl(profileId.value),
        invitedUserId,
        ownerUserId,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        status: status.value,
        updatedAt: row.updatedAt,
      };
    });

const findVerifiedInviteTargetWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    targetUserId,
  }: {
    readonly targetUserId: AppUserId;
  }): Effect.Effect<
    AccountInviteTarget,
    | InviteTargetNotFound
    | InviteTargetNotVerified
    | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* findVerifiedInviteTargetEffect() {
      const operation = "findVerifiedInviteTarget" as const;
      const select = database
        .select({
          image: user.image,
          name: user.name,
          userId: user.id,
          verified: user.verified,
        })
        .from(user)
        .where(eq(user.id, appUserIdToString(targetUserId)))
        .limit(1);
      const rows = yield* persistenceQuery(operation, select);

      const [target] = rows;

      if (target === undefined) {
        return yield* new InviteTargetNotFound();
      }

      if (!target.verified) {
        return yield* new InviteTargetNotVerified();
      }

      const userId = yield* parsePersistedAppUserId(operation, target.userId);

      return {
        image: target.image,
        name: target.name,
        userId,
      };
    });

const upsertAccountAccessInviteWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    invitedUserId,
    now,
    ownerUserId,
  }: {
    readonly accountId: MargonemAccountId;
    readonly ownerUserId: AppUserId;
    readonly invitedUserId: AppUserId;
    readonly now: Date;
  }): Effect.Effect<
    AccountAccessInviteSummary,
    AccountAccessTransitionNotAllowed | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* upsertAccountAccessInviteEffect() {
      const operation = "upsertAccountAccessInvite" as const;
      const accountIdNumber = margonemAccountIdToNumber(accountId);
      const invitedUser = appUserIdToString(invitedUserId);
      const owner = appUserIdToString(ownerUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* upsertAccountAccessInviteTransaction() {
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
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing === undefined) {
            const insert = tx
              .insert(margonemAccountAccess)
              .values({
                accountId: accountIdNumber,
                invitedByUserId: owner,
                status: "pending",
                userId: invitedUser,
              })
              .returning({ id: margonemAccountAccess.id });
            const insertedRows = yield* persistenceQueryUnsafe(insert);

            const [inserted] = insertedRows;

            if (inserted === undefined) {
              return yield* failPersistence(
                operation,
                new Error("Failed to insert account access invite")
              );
            }

            return inserted.id;
          }

          const status = parseAccountAccessStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          if (!canTransitionAccountAccess(status.value, "pending")) {
            return new AccountAccessTransitionNotAllowed({
              attempted: "pending",
              currentStatus: status.value,
            });
          }

          const update = tx
            .update(margonemAccountAccess)
            .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
            .where(eq(margonemAccountAccess.id, existing.id))
            .returning({ id: margonemAccountAccess.id });
          const updatedRows = yield* persistenceQueryUnsafe(update);

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

      if (typeof upserted !== "number") {
        return yield* upserted;
      }

      const accessId = parseMargonemAccountAccessId(upserted);

      if (isError(accessId)) {
        return yield* failPersistence(operation, accessId.error);
      }

      const summary = yield* loadAccountAccessInviteSummaryWithDatabase(
        database
      )(accessId.value, operation).pipe(
        Effect.catchTag("AccountAccessInviteNotFound", (error) =>
          failPersistence(operation, error)
        )
      );

      return summary;
    });

const listIncomingAccountInvitesWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListIncomingAccountInvitesInput): Effect.Effect<
    readonly AccountAccessInviteSummary[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* listIncomingAccountInvitesEffect() {
      const operation = "listIncomingAccountInvites" as const;
      const select = database
        .select({ id: margonemAccountAccess.id })
        .from(margonemAccountAccess)
        .where(
          and(
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "pending")
          )
        )
        .orderBy(desc(margonemAccountAccess.createdAt));
      const rows = yield* persistenceQuery(operation, select);

      const invites: AccountAccessInviteSummary[] = [];

      for (const row of rows) {
        const accessId = parseMargonemAccountAccessId(row.id);

        if (isError(accessId)) {
          return yield* failPersistence(operation, accessId.error);
        }

        const summary = yield* loadAccountAccessInviteSummaryWithDatabase(
          database
        )(accessId.value, operation).pipe(
          Effect.catchTag("AccountAccessInviteNotFound", (error) =>
            failPersistence(operation, error)
          )
        );

        invites.push(summary);
      }

      return invites;
    });

const listSharedAccountsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListSharedAccountsInput): Effect.Effect<
    readonly SharedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* listSharedAccountsEffect() {
      const operation = "listSharedAccounts" as const;
      const select = database
        .select({
          accountId: margonemAccount.id,
          characterCount: sql<number>`count(${margonemCharacter.id})::int`.as(
            "character_count"
          ),
          createdAt: margonemAccount.createdAt,
          displayName: margonemAccount.displayName,
          lastFetchedAt: margonemAccount.lastFetchedAt,
          ownerId: user.id,
          ownerImage: user.image,
          ownerName: user.name,
          profileId: margonemAccount.profileId,
        })
        .from(margonemAccountAccess)
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemAccountAccess.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .leftJoin(
          margonemCharacter,
          eq(margonemCharacter.accountId, margonemAccount.id)
        )
        .where(
          and(
            eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .groupBy(margonemAccount.id, user.id)
        .orderBy(desc(margonemAccount.createdAt), desc(margonemAccount.id));
      const rows = yield* persistenceQuery(operation, select);

      const accounts: SharedMargonemAccountSummary[] = [];

      for (const row of rows) {
        const accountId = parseMargonemAccountId(row.accountId);

        if (isError(accountId)) {
          return yield* failPersistence(operation, accountId.error);
        }

        const displayName = parseAccountDisplayName(row.displayName);

        if (isError(displayName)) {
          return yield* failPersistence(operation, displayName.error);
        }

        const profileId = parseMargonemProfileId(row.profileId);

        if (isError(profileId)) {
          return yield* failPersistence(operation, profileId.error);
        }

        const ownerUserId = parseAppUserId(row.ownerId);

        if (isError(ownerUserId)) {
          return yield* failPersistence(operation, ownerUserId.error);
        }

        accounts.push({
          accountId: accountId.value,
          characterCount: row.characterCount ?? 0,
          displayName: displayName.value,
          generatedProfileUrl: toMargonemProfileUrl(profileId.value),
          lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
          ownerUserId: ownerUserId.value,
          ownerUserImage: row.ownerImage,
          ownerUserName: row.ownerName,
          profileId: profileId.value,
        });
      }

      return accounts;
    });

const listAccountAccessGrantsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
  }: {
    readonly accountId: MargonemAccountId;
  }): Effect.Effect<
    readonly AccountAccessGrantSummary[],
    EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* listAccountAccessGrantsEffect() {
      const operation = "listAccountAccessGrants" as const;
      const select = database
        .select({
          accessId: margonemAccountAccess.id,
          createdAt: margonemAccountAccess.createdAt,
          image: user.image,
          name: user.name,
          status: margonemAccountAccess.status,
          updatedAt: margonemAccountAccess.updatedAt,
          userId: user.id,
        })
        .from(margonemAccountAccess)
        .innerJoin(user, eq(user.id, margonemAccountAccess.userId))
        .where(
          and(
            eq(
              margonemAccountAccess.accountId,
              margonemAccountIdToNumber(accountId)
            ),
            inArray(margonemAccountAccess.status, ["pending", "accepted"])
          )
        )
        .orderBy(desc(margonemAccountAccess.createdAt));
      const rows = yield* persistenceQuery(operation, select);

      const grants: AccountAccessGrantSummary[] = [];

      for (const row of rows) {
        const status = parseAccountAccessStatus(row.status);

        if (isError(status)) {
          return yield* failPersistence(operation, status.error);
        }

        if (status.value !== "pending" && status.value !== "accepted") {
          return yield* failPersistence(
            operation,
            new Error(`Unexpected account access status: ${status.value}`)
          );
        }

        const accessId = parseMargonemAccountAccessId(row.accessId);

        if (isError(accessId)) {
          return yield* failPersistence(operation, accessId.error);
        }

        const invitedUserId = yield* parsePersistedAppUserId(
          operation,
          row.userId
        );

        grants.push({
          accessId: accessId.value,
          createdAt: row.createdAt,
          invitedUserId,
          invitedUserImage: row.image,
          invitedUserName: row.name,
          status: status.value,
          updatedAt: row.updatedAt,
        });
      }

      return grants;
    });

const respondToAccountAccessInviteWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accessId,
    invitedUserId,
    now,
    response,
  }: RespondToAccountAccessInviteStoreInput): Effect.Effect<
    AccountAccessInviteSummary,
    | AccountAccessInviteNotFound
    | ActorIsNotInviteRecipient
    | AccountAccessTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* respondToAccountAccessInviteEffect() {
      const operation = "respondToAccountAccessInvite" as const;
      const invitedUser = appUserIdToString(invitedUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* respondToAccountAccessInviteTransaction() {
          const existingSelect = tx
            .select({
              id: margonemAccountAccess.id,
              status: margonemAccountAccess.status,
              userId: margonemAccountAccess.userId,
            })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, accessId))
            .limit(1);
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing === undefined) {
            return new AccountAccessInviteNotFound();
          }

          if (existing.userId !== invitedUser) {
            return new ActorIsNotInviteRecipient();
          }

          const status = parseAccountAccessStatus(existing.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          const nextStatus: AccountAccessStatus =
            response === "accept" ? "accepted" : "declined";

          if (!canTransitionAccountAccess(status.value, nextStatus)) {
            return new AccountAccessTransitionNotAllowed({
              attempted: nextStatus,
              currentStatus: status.value,
            });
          }

          const update = tx
            .update(margonemAccountAccess)
            .set({ status: nextStatus, updatedAt: now })
            .where(eq(margonemAccountAccess.id, existing.id))
            .returning({ id: margonemAccountAccess.id });
          const updatedRows = yield* persistenceQueryUnsafe(update);

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

const revokeAccountAccessWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accessId,
    now,
    ownerUserId,
  }: RevokeAccountAccessStoreInput): Effect.Effect<
    RevokeAccountAccessResult,
    | AccountAccessInviteNotFound
    | ActorDoesNotOwnMargonemAccount
    | AccountAccessTransitionNotAllowed
    | EffectSquadBuilderPersistenceUnavailable
  > =>
    Effect.gen(function* revokeAccountAccessEffect() {
      const operation = "revokeAccountAccess" as const;
      const accessIdNumber = margonemAccountAccessIdToNumber(accessId);
      const owner = appUserIdToString(ownerUserId);
      const transaction = database.transaction((tx) =>
        Effect.gen(function* revokeAccountAccessTransaction() {
          const accessSelect = tx
            .select({
              accountId: margonemAccountAccess.accountId,
              status: margonemAccountAccess.status,
              userId: margonemAccountAccess.userId,
            })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, accessIdNumber))
            .limit(1);
          const accessRows = yield* persistenceQueryUnsafe(accessSelect);

          const [access] = accessRows;

          if (access === undefined) {
            return new AccountAccessInviteNotFound();
          }

          const accountSelect = tx
            .select({ ownerUserId: margonemAccount.ownerUserId })
            .from(margonemAccount)
            .where(eq(margonemAccount.id, access.accountId))
            .limit(1);
          const accountRows = yield* persistenceQueryUnsafe(accountSelect);

          const [account] = accountRows;

          if (account === undefined) {
            return new AccountAccessInviteNotFound();
          }

          if (account.ownerUserId !== owner) {
            return new ActorDoesNotOwnMargonemAccount();
          }

          const status = parseAccountAccessStatus(access.status);

          if (isError(status)) {
            return yield* failPersistence(operation, status.error);
          }

          if (!canTransitionAccountAccess(status.value, "revoked")) {
            return new AccountAccessTransitionNotAllowed({
              attempted: "revoked",
              currentStatus: status.value,
            });
          }

          yield* persistenceQueryUnsafe(
            tx
              .update(margonemAccountAccess)
              .set({ status: "revoked", updatedAt: now })
              .where(eq(margonemAccountAccess.id, accessIdNumber))
          );

          let removedSquadCharacterCount = 0;

          if (status.value === "accepted") {
            const characterSelect = tx
              .select({ id: margonemCharacter.id })
              .from(margonemCharacter)
              .where(eq(margonemCharacter.accountId, access.accountId));
            const accountCharacters =
              yield* persistenceQueryUnsafe(characterSelect);

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
              const affectedGroups =
                yield* persistenceQueryUnsafe(affectedGroupSelect);

              const affectedGroupIds = [
                ...new Set(affectedGroups.map((group) => group.groupId)),
              ];

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
                const removedPlacements = yield* persistenceQueryUnsafe(
                  removedPlacementsDelete
                );

                removedSquadCharacterCount = removedPlacements.length;

                yield* persistenceQueryUnsafe(
                  tx
                    .update(squadGroup)
                    .set({ updatedAt: now })
                    .where(inArray(squadGroup.id, affectedGroupIds))
                );
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

      const accountId = parseMargonemAccountId(revoked.accountId);

      if (isError(accountId)) {
        return yield* failPersistence(operation, accountId.error);
      }

      const revokedUserId = yield* parsePersistedAppUserId(
        operation,
        revoked.revokedUserId
      );

      return {
        accessId,
        accountId: accountId.value,
        removedSquadCharacterCount: revoked.removedSquadCharacterCount,
        revokedUserId,
      };
    });

export const DrizzleAccountSharingStoreServiceLayer: Layer.Layer<
  AccountSharingStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  AccountSharingStoreService,
  EffectDatabase.useSync((database) =>
    AccountSharingStoreService.of({
      findOwnedAccountForSharing: namedStoreMethod(
        "AccountSharingStore.findOwnedAccountForSharing",
        findOwnedAccountForSharingWithDatabase(database)
      ),
      findVerifiedInviteTarget: namedStoreMethod(
        "AccountSharingStore.findVerifiedInviteTarget",
        findVerifiedInviteTargetWithDatabase(database)
      ),
      listAccountAccessGrants: namedStoreMethod(
        "AccountSharingStore.listAccountAccessGrants",
        listAccountAccessGrantsWithDatabase(database)
      ),
      listIncomingAccountInvites: namedStoreMethod(
        "AccountSharingStore.listIncomingAccountInvites",
        listIncomingAccountInvitesWithDatabase(database)
      ),
      listOwnedAccounts: namedStoreMethod(
        "AccountSharingStore.listOwnedAccounts",
        listOwnedAccountsWithDatabase(database)
      ),
      listSharedAccounts: namedStoreMethod(
        "AccountSharingStore.listSharedAccounts",
        listSharedAccountsWithDatabase(database)
      ),
      respondToAccountAccessInvite: namedStoreMethod(
        "AccountSharingStore.respondToAccountAccessInvite",
        respondToAccountAccessInviteWithDatabase(database)
      ),
      revokeAccountAccess: namedStoreMethod(
        "AccountSharingStore.revokeAccountAccess",
        revokeAccountAccessWithDatabase(database)
      ),
      searchInviteTargets: namedStoreMethod(
        "AccountSharingStore.searchInviteTargets",
        searchInviteTargetsWithDatabase(database)
      ),
      upsertAccountAccessInvite: namedStoreMethod(
        "AccountSharingStore.upsertAccountAccessInvite",
        upsertAccountAccessInviteWithDatabase(database)
      ),
    })
  )
);
