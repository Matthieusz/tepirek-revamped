import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  margonemAccount,
  margonemAccountAccess,
  margonemCharacter,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, asc, desc, eq, ilike, inArray, ne, not, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { AccountAccessStatus } from "../../../domain/squad-builder/account-access-status.ts";
import {
  canTransitionAccountAccess,
  parseAccountAccessStatus,
} from "../../../domain/squad-builder/account-access-status.ts";
import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import {
  appUserIdToString,
  parseAppUserId,
} from "../../../domain/squad-builder/app-user-id.ts";
import type { MargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import {
  margonemAccountAccessIdToNumber,
  parseMargonemAccountAccessId,
} from "../../../domain/squad-builder/margonem-account-access-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import type { OwnedAccountCharacterPreview } from "../../../services/squad-builder/account-import/account-import-store.ts";
import { AccountSharingStoreService } from "../../../services/squad-builder/account-sharing/account-sharing-store-service.ts";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  FindOwnedAccountForSharingInput,
  ListIncomingAccountInvitesInput,
  ListOwnedMargonemAccountsInput,
  ListSharedAccountsInput,
  OwnedMargonemAccountSummary,
  RespondToAccountAccessInviteStoreInput,
  RevokeAccountAccessStoreInput,
  SearchInviteTargetsStoreInput,
  SharedMargonemAccountSummary,
} from "../../../services/squad-builder/account-sharing/account-sharing-store.ts";
import {
  AccountAccessInviteNotFound,
  AccountAccessTransitionNotAllowed,
  ActorDoesNotOwnMargonemAccount,
  ActorIsNotInviteRecipient,
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import {
  failPersistence,
  namedStoreMethod,
  parsePersistedAppUserId,
  persistenceQuery,
} from "./persistence-query.ts";
import type { EffectSquadGroupPersistenceOperation } from "./persistence-query.ts";

const ACCOUNT_CHARACTER_PREVIEW_LIMIT = 1;

const listOwnedAccountsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listOwnedAccountsEffect({
    actorUserId,
  }: ListOwnedMargonemAccountsInput) {
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
    const accountIds = rows.map((row) => row.accountId);
    const characterRows =
      accountIds.length === 0
        ? []
        : yield* persistenceQuery(
            operation,
            database
              .select({
                accountId: margonemCharacter.accountId,
                avatarUrl: margonemCharacter.avatarUrl,
                characterId: margonemCharacter.characterId,
                id: margonemCharacter.id,
                level: margonemCharacter.level,
                name: margonemCharacter.name,
                profession: margonemCharacter.profession,
              })
              .from(margonemCharacter)
              .where(inArray(margonemCharacter.accountId, accountIds))
              .orderBy(
                asc(margonemCharacter.accountId),
                desc(margonemCharacter.level),
                asc(margonemCharacter.id)
              )
          );
    const characterPreviewsByAccount = new Map<
      number,
      OwnedAccountCharacterPreview[]
    >();

    for (const row of characterRows) {
      const previews = characterPreviewsByAccount.get(row.accountId) ?? [];
      if (previews.length < ACCOUNT_CHARACTER_PREVIEW_LIMIT) {
        previews.push({
          avatarUrl: row.avatarUrl,
          characterId: row.characterId,
          name: row.name,
          profession: row.profession,
        });
        characterPreviewsByAccount.set(row.accountId, previews);
      }
    }

    const accounts: OwnedMargonemAccountSummary[] = [];

    for (const row of rows) {
      const accountId = yield* parseMargonemAccountId(row.accountId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const displayName = yield* parseAccountDisplayName(row.displayName).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const profileId = yield* parseMargonemProfileId(row.profileId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      accounts.push({
        accountId,
        characterCount: row.characterCount ?? 0,
        characterPreviews: characterPreviewsByAccount.get(row.accountId) ?? [],
        displayName,
        generatedProfileUrl: toMargonemProfileUrl(profileId),
        lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
        profileId,
      });
    }

    return accounts;
  });

const searchInviteTargetsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* searchInviteTargetsEffect({
    accountId,
    actorUserId,
    query,
  }: SearchInviteTargetsStoreInput) {
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
      const userId = yield* parseAppUserId(row.userId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      targets.push({
        image: row.image,
        name: row.name,
        userId,
      });
    }

    return targets;
  });

const findOwnedAccountForSharingWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* findOwnedAccountForSharingEffect({
    accountId,
  }: FindOwnedAccountForSharingInput) {
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

    const displayName = yield* parseAccountDisplayName(
      account.displayName
    ).pipe(Effect.catch((error) => failPersistence(operation, error)));

    const ownerUserId = yield* parseAppUserId(account.ownerUserId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const profileId = yield* parseMargonemProfileId(account.profileId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    return {
      accountId,
      displayName,
      ownerUserId,
      profileId,
    };
  });

const loadAccountAccessInviteSummaryWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* loadAccountAccessInviteSummaryEffect(
    accessId: MargonemAccountAccessId,
    operation: EffectSquadGroupPersistenceOperation
  ) {
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

    const status = yield* parseAccountAccessStatus(row.status).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const accountDisplayName = yield* parseAccountDisplayName(
      row.accountDisplayName
    ).pipe(Effect.catch((error) => failPersistence(operation, error)));

    const accountId = yield* parseMargonemAccountId(row.accountId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const profileId = yield* parseMargonemProfileId(row.profileId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const invitedUserId = yield* parsePersistedAppUserId(
      operation,
      row.invitedUserId
    );
    const ownerUserId = yield* parsePersistedAppUserId(operation, row.ownerId);

    return {
      accessId,
      accountDisplayName,
      accountId,
      createdAt: row.createdAt,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      invitedUserId,
      ownerUserId,
      ownerUserImage: row.ownerImage,
      ownerUserName: row.ownerName,
      status,
      updatedAt: row.updatedAt,
    };
  });

const findVerifiedInviteTargetWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* findVerifiedInviteTargetEffect({
    targetUserId,
  }: {
    readonly targetUserId: AppUserId;
  }) {
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

const upsertAccountAccessInviteWithDatabase = (database: EffectPgDatabase) =>
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
    const accountIdNumber = margonemAccountIdToNumber(accountId);
    const invitedUser = appUserIdToString(invitedUserId);
    const owner = appUserIdToString(ownerUserId);
    const transaction = database.transaction(
      Effect.fnUntraced(function* upsertAccountAccessInviteTransaction(
        tx: TransactionDatabase
      ) {
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
        const existingRows = yield* existingSelect;

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
          const insertedRows = yield* insert;

          const [inserted] = insertedRows;

          if (inserted === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to insert account access invite")
            );
          }

          return inserted.id;
        }

        const status = yield* parseAccountAccessStatus(existing.status).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );

        if (!canTransitionAccountAccess(status, "pending")) {
          return new AccountAccessTransitionNotAllowed({
            attempted: "pending",
            currentStatus: status,
          });
        }

        const update = tx
          .update(margonemAccountAccess)
          .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
          .where(eq(margonemAccountAccess.id, existing.id))
          .returning({ id: margonemAccountAccess.id });
        const updatedRows = yield* update;

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

const listIncomingAccountInvitesWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listIncomingAccountInvitesEffect({
    actorUserId,
  }: ListIncomingAccountInvitesInput) {
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
      const accessId = yield* parseMargonemAccountAccessId(row.id).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const summary = yield* loadAccountAccessInviteSummaryWithDatabase(
        database
      )(accessId, operation).pipe(
        Effect.catchTag("AccountAccessInviteNotFound", (error) =>
          failPersistence(operation, error)
        )
      );

      invites.push(summary);
    }

    return invites;
  });

const listSharedAccountsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listSharedAccountsEffect({
    actorUserId,
  }: ListSharedAccountsInput) {
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
      const accountId = yield* parseMargonemAccountId(row.accountId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const displayName = yield* parseAccountDisplayName(row.displayName).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const profileId = yield* parseMargonemProfileId(row.profileId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const ownerUserId = yield* parseAppUserId(row.ownerId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      accounts.push({
        accountId,
        characterCount: row.characterCount ?? 0,
        displayName,
        generatedProfileUrl: toMargonemProfileUrl(profileId),
        lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
        ownerUserId,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        profileId,
      });
    }

    return accounts;
  });

const listAccountAccessGrantsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listAccountAccessGrantsEffect({
    accountId,
  }: {
    readonly accountId: MargonemAccountId;
  }) {
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
      const status = yield* parseAccountAccessStatus(row.status).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      if (status !== "pending" && status !== "accepted") {
        return yield* failPersistence(
          operation,
          new Error(`Unexpected account access status: ${status}`)
        );
      }

      const accessId = yield* parseMargonemAccountAccessId(row.accessId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const invitedUserId = yield* parsePersistedAppUserId(
        operation,
        row.userId
      );

      grants.push({
        accessId,
        createdAt: row.createdAt,
        invitedUserId,
        invitedUserImage: row.image,
        invitedUserName: row.name,
        status,
        updatedAt: row.updatedAt,
      });
    }

    return grants;
  });

const respondToAccountAccessInviteWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* respondToAccountAccessInviteEffect({
    accessId,
    invitedUserId,
    now,
    response,
  }: RespondToAccountAccessInviteStoreInput) {
    const operation = "respondToAccountAccessInvite" as const;
    const invitedUser = appUserIdToString(invitedUserId);
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
          .limit(1);
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          return new AccountAccessInviteNotFound();
        }

        if (existing.userId !== invitedUser) {
          return new ActorIsNotInviteRecipient();
        }

        const status = yield* parseAccountAccessStatus(existing.status).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );

        const nextStatus: AccountAccessStatus =
          response === "accept" ? "accepted" : "declined";

        if (!canTransitionAccountAccess(status, nextStatus)) {
          return new AccountAccessTransitionNotAllowed({
            attempted: nextStatus,
            currentStatus: status,
          });
        }

        const update = tx
          .update(margonemAccountAccess)
          .set({ status: nextStatus, updatedAt: now })
          .where(eq(margonemAccountAccess.id, existing.id))
          .returning({ id: margonemAccountAccess.id });
        const updatedRows = yield* update;

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

const revokeAccountAccessWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* revokeAccountAccessEffect({
    accessId,
    now,
    ownerUserId,
  }: RevokeAccountAccessStoreInput) {
    const operation = "revokeAccountAccess" as const;
    const accessIdNumber = margonemAccountAccessIdToNumber(accessId);
    const owner = appUserIdToString(ownerUserId);
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
          .limit(1);
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

        const status = yield* parseAccountAccessStatus(access.status).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );

        if (!canTransitionAccountAccess(status, "revoked")) {
          return new AccountAccessTransitionNotAllowed({
            attempted: "revoked",
            currentStatus: status,
          });
        }

        yield* tx
          .update(margonemAccountAccess)
          .set({ status: "revoked", updatedAt: now })
          .where(eq(margonemAccountAccess.id, accessIdNumber));

        let removedSquadCharacterCount = 0;

        if (status === "accepted") {
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
