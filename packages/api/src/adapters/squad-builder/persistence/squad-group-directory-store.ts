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
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  ilike,
  lte,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../../../domain/squad-builder/margonem-character.ts";
import {
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "../../../domain/squad-builder/margonem-profile-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type {
  AvailableSquadCharacter,
  GlobalSquadGroupSummary,
  ListAvailableCharactersForOwnerInput,
  ListGlobalSquadGroupsInput,
  SearchSquadEditorInviteTargetsStoreInput,
  SquadEditorInviteTarget,
} from "../../../services/squad-builder/squad-groups/squad-group-directory-store.ts";
import { SquadGroupDirectoryStoreService } from "../../../services/squad-builder/squad-groups/squad-group-directory-store.ts";
import {
  SquadEditorInviteTargetNotFound,
  SquadEditorInviteTargetNotVerified,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import {
  escapeLikePattern,
  failPersistence,
  parsePersistedAppUserId,
  persistenceQuery,
} from "./persistence-query.ts";
import type { EffectSquadGroupPersistenceOperation } from "./persistence-query.ts";

const searchSquadEditorInviteTargetsWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* searchSquadEditorInviteTargetsEffect({
    groupId,
    maxResults,
    ownerUserId,
    query,
  }: SearchSquadEditorInviteTargetsStoreInput) {
    const operation = "searchSquadEditorInviteTargets" as const;
    const groupIdNumber = groupId;
    const owner = ownerUserId;
    const select = database
      .select({ image: user.image, name: user.name, userId: user.id })
      .from(user)
      .where(
        and(
          eq(user.verified, true),
          ne(user.id, owner),
          ilike(user.name, `%${query}%`),
          not(
            sql`${user.id} in (
                select ${squadGroupInvitation.invitedUserId}
                from ${squadGroupInvitation}
                where ${squadGroupInvitation.squadGroupId} = ${groupIdNumber}
                  and ${squadGroupInvitation.status} in ('pending', 'accepted')
              )`
          )
        )
      )
      .orderBy(user.name)
      .limit(maxResults);
    const rows = yield* persistenceQuery(operation, select);

    const targets: SquadEditorInviteTarget[] = [];

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

const findVerifiedSquadEditorInviteTargetWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* findVerifiedSquadEditorInviteTargetEffect({
    targetUserId,
  }: {
    readonly targetUserId: AppUserId;
  }) {
    const operation = "findVerifiedSquadEditorInviteTarget" as const;
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
      return yield* new SquadEditorInviteTargetNotFound();
    }

    if (!target.verified) {
      return yield* new SquadEditorInviteTargetNotVerified();
    }

    const userId = yield* parsePersistedAppUserId(operation, target.userId);

    return {
      image: target.image,
      name: target.name,
      userId,
    };
  });

export const listAvailableCharactersForOwnerWithDatabase = (
  database: EffectPgDatabase | TransactionDatabase,
  operation: EffectSquadGroupPersistenceOperation = "listAvailableCharactersForOwner",
  lockRows = false
) =>
  Effect.fnUntraced(function* listAvailableCharactersForOwnerEffect({
    ownerUserId,
  }: ListAvailableCharactersForOwnerInput) {
    const owner = ownerUserId;

    if (lockRows) {
      const accessLock = database
        .select({ id: margonemAccountAccess.id })
        .from(margonemAccountAccess)
        .where(
          and(
            eq(margonemAccountAccess.userId, owner),
            eq(margonemAccountAccess.status, "accepted")
          )
        )
        .for("update");
      yield* persistenceQuery(operation, accessLock);
    }

    const select = database
      .select({
        accountDisplayName: margonemAccount.displayName,
        accountId: margonemAccount.id,
        accountOwnerUserId: margonemAccount.ownerUserId,
        accountOwnerUserImage: user.image,
        accountOwnerUserName: user.name,
        avatarUrl: margonemCharacter.avatarUrl,
        characterId: margonemCharacter.id,
        level: margonemCharacter.level,
        margonemCharacterId: margonemCharacter.characterId,
        name: margonemCharacter.name,
        profession: margonemCharacter.profession,
        world: margonemCharacter.world,
      })
      .from(margonemCharacter)
      .innerJoin(
        margonemAccount,
        eq(margonemAccount.id, margonemCharacter.accountId)
      )
      .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
      .leftJoin(
        margonemAccountAccess,
        and(
          eq(margonemAccountAccess.accountId, margonemAccount.id),
          eq(margonemAccountAccess.userId, owner),
          eq(margonemAccountAccess.status, "accepted")
        )
      )
      .where(
        and(
          eq(margonemCharacter.world, "jaruna"),
          sql`(${margonemAccount.ownerUserId} = ${owner} or ${margonemAccountAccess.id} is not null)`
        )
      )
      .orderBy(asc(margonemAccount.displayName), asc(margonemCharacter.level));
    const rows = yield* persistenceQuery(operation, select);

    const characters: AvailableSquadCharacter[] = [];

    for (const row of rows) {
      const accountDisplayName = yield* parseAccountDisplayName(
        row.accountDisplayName
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      const accountId = yield* parseMargonemAccountId(row.accountId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const accountOwnerUserId = yield* parseAppUserId(
        row.accountOwnerUserId
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      const level = yield* parsePositiveLevel(row.level).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const profession = yield* parseMargonemProfession(row.profession).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const world = yield* parseMargonemWorld(row.world).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const margonemCharacterId = yield* parseMargonemCharacterId(
        row.margonemCharacterId
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      characters.push({
        accountDisplayName,
        accountId,
        accountOwnerUserId,
        accountOwnerUserImage: row.accountOwnerUserImage,
        accountOwnerUserName: row.accountOwnerUserName,
        avatarUrl: row.avatarUrl,
        characterId: row.characterId,
        level,
        margonemCharacterId,
        name: row.name,
        profession,
        world,
      });
    }

    return characters;
  });

/** Build SQL predicates shared by global and shared-group directory queries. */
export const buildSquadGroupListFilterPredicates = (
  database: EffectPgDatabase,
  filters: ListGlobalSquadGroupsInput["filters"]
) => {
  const predicates = [];

  if (filters.nameQuery !== undefined) {
    const escapedQuery = escapeLikePattern(filters.nameQuery);
    const namePredicate = or(
      ilike(squadGroup.name, `%${escapedQuery}%`),
      exists(
        database
          .select({ one: sql`1` })
          .from(squad)
          .where(
            and(
              eq(squad.squadGroupId, squadGroup.id),
              ilike(squad.name, `%${escapedQuery}%`)
            )
          )
      )
    );

    if (namePredicate !== undefined) {
      predicates.push(namePredicate);
    }
  }

  if (filters.levelRange._tag === "BoundedLevelRange") {
    const levelPredicates = [eq(squad.squadGroupId, squadGroup.id)];

    if (filters.levelRange.minLevel !== undefined) {
      levelPredicates.push(
        gte(margonemCharacter.level, filters.levelRange.minLevel)
      );
    }

    if (filters.levelRange.maxLevel !== undefined) {
      levelPredicates.push(
        lte(margonemCharacter.level, filters.levelRange.maxLevel)
      );
    }

    predicates.push(
      exists(
        database
          .select({ one: sql`1` })
          .from(squad)
          .innerJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
          .innerJoin(
            margonemCharacter,
            eq(margonemCharacter.id, squadCharacter.characterId)
          )
          .where(and(...levelPredicates))
      )
    );
  }

  return predicates;
};

const listGlobalSquadGroupsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listGlobalSquadGroupsEffect({
    filters,
    limit,
  }: ListGlobalSquadGroupsInput) {
    const operation = "listGlobalSquadGroups" as const;
    const filterPredicates = buildSquadGroupListFilterPredicates(
      database,
      filters
    );
    const select = database
      .select({
        characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
        groupId: squadGroup.id,
        name: squadGroup.name,
        ownerId: user.id,
        ownerImage: user.image,
        ownerName: user.name,
        squadCount: sql<number>`count(distinct ${squad.id})::int`,
        updatedAt: squadGroup.updatedAt,
      })
      .from(squadGroup)
      .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
      .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
      .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
      .where(and(eq(squadGroup.visibility, "global"), ...filterPredicates))
      .groupBy(squadGroup.id, user.id)
      .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id))
      .limit(limit);
    const rows = yield* persistenceQuery(operation, select);

    const groups: GlobalSquadGroupSummary[] = [];

    for (const row of rows) {
      const groupId = yield* parseSquadGroupId(row.groupId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const name = yield* parseSquadGroupName(row.name).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        row.ownerId
      );

      groups.push({
        characterCount: row.characterCount ?? 0,
        groupId,
        name,
        ownerUserId,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        squadCount: row.squadCount ?? 0,
        updatedAt: row.updatedAt,
      });
    }

    return groups;
  });

/** Provide the squad-group directory store with its Drizzle implementation. */
export const DrizzleSquadGroupDirectoryStoreServiceLayer: Layer.Layer<
  SquadGroupDirectoryStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  SquadGroupDirectoryStoreService,
  EffectDatabase.useSync((database) =>
    SquadGroupDirectoryStoreService.of({
      findVerifiedSquadEditorInviteTarget: Effect.fn(
        "SquadGroupDirectoryStore.findVerifiedSquadEditorInviteTarget"
      )(findVerifiedSquadEditorInviteTargetWithDatabase(database)),
      listAvailableCharactersForOwner: Effect.fn(
        "SquadGroupDirectoryStore.listAvailableCharactersForOwner"
      )(listAvailableCharactersForOwnerWithDatabase(database)),
      listGlobalSquadGroups: Effect.fn(
        "SquadGroupDirectoryStore.listGlobalSquadGroups"
      )(listGlobalSquadGroupsWithDatabase(database)),
      searchSquadEditorInviteTargets: Effect.fn(
        "SquadGroupDirectoryStore.searchSquadEditorInviteTargets"
      )(searchSquadEditorInviteTargetsWithDatabase(database)),
    })
  )
);
