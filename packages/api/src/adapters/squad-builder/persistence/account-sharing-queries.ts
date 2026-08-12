import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  margonemAccount,
  margonemAccountAccess,
  margonemCharacter,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, desc, eq, ilike, inArray, ne, not, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";

import { parseAccountAccessStatus } from "../../../domain/squad-builder/account-access-status.ts";
import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import type {
  AccountAccessGrantSummary,
  AccountAccessInviteSummary,
  AccountInviteTarget,
  FindAccountOwnerUserIdInput,
  ListIncomingAccountInvitesInput,
  ListSharedAccountsInput,
  SearchInviteTargetsStoreInput,
  SharedMargonemAccountSummary,
} from "../../../services/squad-builder/account-sharing/account-sharing-store.ts";
import {
  InviteTargetNotFound,
  InviteTargetNotVerified,
  MargonemAccountNotFound,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  persistenceQuery,
} from "./persistence-query.ts";

/** Search verified users who can receive account access. */
export const searchInviteTargetsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* searchInviteTargetsEffect({
    accountId,
    actorUserId,
    query,
  }: SearchInviteTargetsStoreInput) {
    const operation = "searchInviteTargets" as const;
    const accountIdNumber = accountId;
    const actor = actorUserId;
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

/** Resolve the owner of an account for sharing authorization. */
export const findAccountOwnerUserIdWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* findAccountOwnerUserIdEffect({
    accountId,
  }: FindAccountOwnerUserIdInput) {
    const operation = "findAccountOwnerUserId" as const;
    const select = database
      .select({ ownerUserId: margonemAccount.ownerUserId })
      .from(margonemAccount)
      .where(eq(margonemAccount.id, accountId))
      .limit(1);
    const rows = yield* persistenceQuery(operation, select);

    const [account] = rows;

    if (account === undefined) {
      return yield* new MargonemAccountNotFound();
    }

    return yield* parsePersistedAppUserId(operation, account.ownerUserId);
  });

/** Load and verify one account-invite target. */
export const findVerifiedInviteTargetWithDatabase = (
  database: EffectPgDatabase
) =>
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
      .where(eq(user.id, targetUserId))
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

/** Load pending account invitations addressed to a user. */
export const listIncomingAccountInvitesWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* listIncomingAccountInvitesEffect({
    actorUserId,
  }: ListIncomingAccountInvitesInput) {
    const operation = "listIncomingAccountInvites" as const;
    const select = database
      .select({
        accountDisplayName: margonemAccount.displayName,
        accountId: margonemAccountAccess.accountId,
        createdAt: margonemAccountAccess.createdAt,
        id: margonemAccountAccess.id,
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
      .where(
        and(
          eq(margonemAccountAccess.userId, actorUserId),
          eq(margonemAccountAccess.status, "pending")
        )
      )
      .orderBy(
        desc(margonemAccountAccess.createdAt),
        desc(margonemAccountAccess.id)
      );
    const rows = yield* persistenceQuery(operation, select);

    const invites: AccountAccessInviteSummary[] = [];

    for (const row of rows) {
      const accessId = yield* parseMargonemAccountAccessId(row.id).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

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
      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        row.ownerId
      );

      invites.push({
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
      });
    }

    return invites;
  });

/** Load the accounts currently shared with a user. */
export const listSharedAccountsWithDatabase = (database: EffectPgDatabase) =>
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
          eq(margonemAccountAccess.userId, actorUserId),
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

/** Load active account-access grants for an account owner. */
export const listAccountAccessGrantsWithDatabase = (
  database: EffectPgDatabase
) =>
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
          eq(margonemAccountAccess.accountId, accountId),
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
