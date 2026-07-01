import { EffectDatabase } from "@tepirek-revamped/db/effect";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
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
  or,
  sql,
} from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../account-display-name";
import { appUserIdToString, parseAppUserId } from "../app-user-id";
import type { AppUserId } from "../app-user-id";
import { parseMargonemAccountId } from "../margonem-account-id";
import type { MargonemAccountId } from "../margonem-account-id";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../margonem-character";
import {
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
} from "../margonem-profile-id";
import { toMargonemProfileUrl } from "../margonem-profile-url";
import { isError } from "../result";
import type { SquadGroupAccess } from "../squad-group-access";
import { parseSquadGroupId, squadGroupIdToNumber } from "../squad-group-id";
import { parseSquadGroupInvitationId } from "../squad-group-invitation-id";
import {
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "../squad-group-list-filters";
import { parseSquadGroupVisibility } from "../squad-group-visibility";
import { parseSquadId } from "../squad-id";
import { parseSquadGroupName, squadGroupNameToString } from "../squad-name";
import { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  AvailableSquadCharacter,
  CreateSquadGroupStoreInput,
  GlobalSquadGroupSummary,
  GetSquadGroupDetailInput,
  ListAvailableCharactersForOwnerInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  ListOwnedMargonemAccountsInput,
  OwnedMargonemAccountSummary,
  SetSquadGroupVisibilityStoreInput,
  SquadGroupVisibilityChange,
  SquadGroupCharacter,
  SquadGroupDetail,
  SquadGroupNotFound,
  SquadGroupSummary,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

type EffectSquadGroupPersistenceOperation =
  | "createSquadGroup"
  | "getSquadGroupDetail"
  | "listAvailableCharactersForOwner"
  | "listGlobalSquadGroups"
  | "listOwnedAccounts"
  | "listMySquadGroups"
  | "setSquadGroupVisibility";

const escapeLikePattern = (value: string): string =>
  value.replaceAll(/[\\%_]/gu, "\\$&");

const failPersistence = (
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

const parsePersistedAppUserId = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
): Effect.Effect<
  AppUserId,
  EffectSquadBuilderPersistenceUnavailable,
  never
> => {
  const userId = parseAppUserId(value);

  if (isError(userId)) {
    return failPersistence(operation, userId.error);
  }

  return Effect.succeed(userId.value);
};

const parsePersistedSquadGroupName = (
  operation: EffectSquadGroupPersistenceOperation,
  value: string
) => {
  const name = parseSquadGroupName(value);

  if (isError(name)) {
    return failPersistence(operation, name.error);
  }

  return Effect.succeed(name.value);
};

const createSquadGroupWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    name,
  }: CreateSquadGroupStoreInput): Effect.Effect<
    SquadGroupSummary,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createSquadGroupEffect() {
      const insert = database
        .insert(squadGroup)
        .values({
          name: squadGroupNameToString(name),
          ownerUserId: appUserIdToString(actorUserId),
          visibility: "private",
        })
        .returning({
          id: squadGroup.id,
          updatedAt: squadGroup.updatedAt,
        });
      // SAFETY: Drizzle's Effect PostgreSQL insert builder is an Effect whose
      // runtime value is the returned row array. The cast narrows the generated
      // query effect so this adapter can translate its typed query failure into
      // the local persistence error below.
      const insertEffect = insert as Effect.Effect<
        readonly { readonly id: number; readonly updatedAt: Date }[],
        unknown,
        never
      >;
      const createdRows = yield* insertEffect.pipe(
        Effect.catch((error) => failPersistence("createSquadGroup", error))
      );

      const [created] = createdRows;

      if (created === undefined) {
        return yield* failPersistence(
          "createSquadGroup",
          new Error("Failed to insert squad group")
        );
      }

      const groupId = parseSquadGroupId(created.id);

      if (isError(groupId)) {
        return yield* failPersistence("createSquadGroup", groupId.error);
      }

      return {
        characterCount: 0,
        groupId: groupId.value,
        name,
        squadCount: 0,
        updatedAt: created.updatedAt,
      };
    });

const listMySquadGroupsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListMySquadGroupsInput): Effect.Effect<
    readonly SquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listMySquadGroupsEffect() {
      const select = database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroup)
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(eq(squadGroup.ownerUserId, appUserIdToString(actorUserId)))
        .groupBy(squadGroup.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id));
      // SAFETY: Drizzle's Effect PostgreSQL select builder is an Effect whose
      // runtime value is the selected row array. The cast narrows the generated
      // query effect so this adapter can translate its typed query failure into
      // the local persistence error below.
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly characterCount: number | null;
          readonly groupId: number;
          readonly name: string;
          readonly squadCount: number | null;
          readonly updatedAt: Date;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence("listMySquadGroups", error))
      );

      const groups: SquadGroupSummary[] = [];

      for (const row of rows) {
        const groupId = parseSquadGroupId(row.groupId);

        if (isError(groupId)) {
          return yield* failPersistence("listMySquadGroups", groupId.error);
        }

        const name = parseSquadGroupName(row.name);

        if (isError(name)) {
          return yield* failPersistence("listMySquadGroups", name.error);
        }

        groups.push({
          characterCount: row.characterCount ?? 0,
          groupId: groupId.value,
          name: name.value,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        });
      }

      return groups;
    });

const listOwnedAccountsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListOwnedMargonemAccountsInput): Effect.Effect<
    readonly OwnedMargonemAccountSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly accountId: number;
          readonly characterCount: number | null;
          readonly createdAt: Date;
          readonly displayName: string;
          readonly lastFetchedAt: Date | null;
          readonly profileId: number;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
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

const listAvailableCharactersForOwnerWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    ownerUserId,
  }: ListAvailableCharactersForOwnerInput): Effect.Effect<
    readonly AvailableSquadCharacter[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listAvailableCharactersForOwnerEffect() {
      const operation = "listAvailableCharactersForOwner" as const;
      const owner = appUserIdToString(ownerUserId);
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
        .orderBy(
          asc(margonemAccount.displayName),
          asc(margonemCharacter.level)
        );
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly accountDisplayName: string;
          readonly accountId: number;
          readonly accountOwnerUserId: string;
          readonly accountOwnerUserImage: string | null;
          readonly accountOwnerUserName: string;
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly level: number;
          readonly margonemCharacterId: number;
          readonly name: string;
          readonly profession: string;
          readonly world: string;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const characters: AvailableSquadCharacter[] = [];

      for (const row of rows) {
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

        const accountOwnerUserId = parseAppUserId(row.accountOwnerUserId);

        if (isError(accountOwnerUserId)) {
          return yield* failPersistence(operation, accountOwnerUserId.error);
        }

        const level = parsePositiveLevel(row.level);

        if (isError(level)) {
          return yield* failPersistence(operation, level.error);
        }

        const profession = parseMargonemProfession(row.profession);

        if (isError(profession)) {
          return yield* failPersistence(operation, profession.error);
        }

        const world = parseMargonemWorld(row.world);

        if (isError(world)) {
          return yield* failPersistence(operation, world.error);
        }

        const margonemCharacterId = parseMargonemCharacterId(
          row.margonemCharacterId
        );

        if (isError(margonemCharacterId)) {
          return yield* failPersistence(operation, margonemCharacterId.error);
        }

        characters.push({
          accountDisplayName: accountDisplayName.value,
          accountId: accountId.value,
          accountOwnerUserId: accountOwnerUserId.value,
          accountOwnerUserImage: row.accountOwnerUserImage,
          accountOwnerUserName: row.accountOwnerUserName,
          avatarUrl: row.avatarUrl,
          characterId: row.characterId,
          level: level.value,
          margonemCharacterId: margonemCharacterId.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      return characters;
    });

const getSquadGroupDetailWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    groupId,
  }: GetSquadGroupDetailInput): Effect.Effect<
    SquadGroupDetail,
    | SquadGroupNotFound
    | ActorCannotViewSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* getSquadGroupDetailEffect() {
      const operation = "getSquadGroupDetail" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const actor = appUserIdToString(actorUserId);
      const groupSelect = database
        .select({
          name: squadGroup.name,
          ownerUserId: squadGroup.ownerUserId,
          updatedAt: squadGroup.updatedAt,
          visibility: squadGroup.visibility,
        })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNumber))
        .limit(1);
      const groupSelectEffect = groupSelect as Effect.Effect<
        readonly {
          readonly name: string;
          readonly ownerUserId: string;
          readonly updatedAt: Date;
          readonly visibility: string;
        }[],
        unknown,
        never
      >;
      const groupRows = yield* groupSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [group] = groupRows;

      if (group === undefined) {
        return yield* Effect.fail({ _tag: "SquadGroupNotFound" as const });
      }

      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        group.ownerUserId
      );
      const groupName = yield* parsePersistedSquadGroupName(
        operation,
        group.name
      );
      const visibility = parseSquadGroupVisibility(group.visibility);

      if (isError(visibility)) {
        return yield* failPersistence(operation, visibility.error);
      }

      let access: SquadGroupAccess;

      if (group.ownerUserId === actor) {
        access = {
          _tag: "SquadGroupOwnerAccess",
          groupId,
          ownerUserId: actorUserId,
          role: "owner",
        };
      } else {
        const inviteSelect = database
          .select({ id: squadGroupInvitation.id })
          .from(squadGroupInvitation)
          .where(
            and(
              eq(squadGroupInvitation.squadGroupId, groupIdNumber),
              eq(squadGroupInvitation.invitedUserId, actor),
              eq(squadGroupInvitation.status, "accepted")
            )
          )
          .limit(1);
        const inviteSelectEffect = inviteSelect as Effect.Effect<
          readonly { readonly id: number }[],
          unknown,
          never
        >;
        const inviteRows = yield* inviteSelectEffect.pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );
        const [invite] = inviteRows;

        if (invite === undefined) {
          if (visibility.value !== "global") {
            return yield* Effect.fail({
              _tag: "ActorCannotViewSquadGroup" as const,
            });
          }

          access = {
            _tag: "SquadGroupViewerAccess",
            groupId,
            ownerUserId,
            role: "viewer",
          };
        } else {
          const invitationId = parseSquadGroupInvitationId(invite.id);

          if (isError(invitationId)) {
            return yield* failPersistence(operation, invitationId.error);
          }

          access = {
            _tag: "SquadGroupEditorAccess",
            editorUserId: actorUserId,
            groupId,
            invitationId: invitationId.value,
            ownerUserId,
            role: "editor",
          };
        }
      }

      const squadSelect = database
        .select({
          id: squad.id,
          name: squad.name,
          position: squad.position,
        })
        .from(squad)
        .where(eq(squad.squadGroupId, groupIdNumber))
        .orderBy(asc(squad.position), asc(squad.id));
      const squadSelectEffect = squadSelect as Effect.Effect<
        readonly {
          readonly id: number;
          readonly name: string;
          readonly position: number;
        }[],
        unknown,
        never
      >;
      const squadRows = yield* squadSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const placementSelect = database
        .select({
          accountDisplayName: margonemAccount.displayName,
          accountId: margonemAccount.id,
          accountOwnerUserImage: user.image,
          accountOwnerUserName: user.name,
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.id,
          level: margonemCharacter.level,
          margonemCharacterId: margonemCharacter.characterId,
          name: margonemCharacter.name,
          placementId: squadCharacter.id,
          position: squadCharacter.position,
          profession: margonemCharacter.profession,
          squadId: squadCharacter.squadId,
        })
        .from(squadCharacter)
        .innerJoin(
          margonemCharacter,
          eq(margonemCharacter.id, squadCharacter.characterId)
        )
        .innerJoin(
          margonemAccount,
          eq(margonemAccount.id, margonemCharacter.accountId)
        )
        .innerJoin(user, eq(user.id, margonemAccount.ownerUserId))
        .where(eq(squadCharacter.squadGroupId, groupIdNumber))
        .orderBy(asc(squadCharacter.position), asc(squadCharacter.id));
      const placementSelectEffect = placementSelect as Effect.Effect<
        readonly {
          readonly accountDisplayName: string;
          readonly accountId: number;
          readonly accountOwnerUserImage: string | null;
          readonly accountOwnerUserName: string;
          readonly avatarUrl: string | null;
          readonly characterId: number;
          readonly level: number;
          readonly margonemCharacterId: number;
          readonly name: string;
          readonly placementId: number;
          readonly position: number;
          readonly profession: string;
          readonly squadId: number;
        }[],
        unknown,
        never
      >;
      const placementRows = yield* placementSelectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const charactersBySquadId = new Map<number, SquadGroupCharacter[]>();

      for (const placement of placementRows) {
        const current = charactersBySquadId.get(placement.squadId) ?? [];
        const accountDisplayName = parseAccountDisplayName(
          placement.accountDisplayName
        );

        if (isError(accountDisplayName)) {
          return yield* failPersistence(operation, accountDisplayName.error);
        }

        const level = parsePositiveLevel(placement.level);

        if (isError(level)) {
          return yield* failPersistence(operation, level.error);
        }

        const profession = parseMargonemProfession(placement.profession);

        if (isError(profession)) {
          return yield* failPersistence(operation, profession.error);
        }

        const margonemCharacterId = parseMargonemCharacterId(
          placement.margonemCharacterId
        );

        if (isError(margonemCharacterId)) {
          return yield* failPersistence(operation, margonemCharacterId.error);
        }

        current.push({
          accountDisplayName: accountDisplayName.value,
          accountId: placement.accountId as MargonemAccountId,
          accountOwnerUserImage: placement.accountOwnerUserImage,
          accountOwnerUserName: placement.accountOwnerUserName,
          avatarUrl: placement.avatarUrl,
          characterId: placement.characterId,
          level: level.value,
          margonemCharacterId: margonemCharacterId.value,
          name: placement.name,
          placementId: placement.placementId,
          position: placement.position,
          profession: profession.value,
        });
        charactersBySquadId.set(placement.squadId, current);
      }

      const squads = [];

      for (const row of squadRows) {
        const squadId = parseSquadId(row.id);

        if (isError(squadId)) {
          return yield* failPersistence(operation, squadId.error);
        }

        squads.push({
          characters: charactersBySquadId.get(row.id) ?? [],
          name: row.name,
          position: row.position,
          squadId: squadId.value,
        });
      }

      return {
        accessRole: access.role,
        groupId,
        name: groupName,
        ownerUserId,
        squads,
        updatedAt: group.updatedAt,
        visibility: visibility.value,
      };
    });

const buildSquadGroupListFilterPredicates = (
  database: EffectPgDatabase,
  filters: ListGlobalSquadGroupsInput["filters"]
) => {
  const predicates = [];

  if (filters.nameQuery !== undefined) {
    const escapedQuery = escapeLikePattern(
      squadGroupNameQueryToString(filters.nameQuery)
    );
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
        gte(
          margonemCharacter.level,
          squadGroupLevelBoundToNumber(filters.levelRange.minLevel)
        )
      );
    }

    if (filters.levelRange.maxLevel !== undefined) {
      levelPredicates.push(
        lte(
          margonemCharacter.level,
          squadGroupLevelBoundToNumber(filters.levelRange.maxLevel)
        )
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

const listGlobalSquadGroupsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    filters,
    limit,
  }: ListGlobalSquadGroupsInput): Effect.Effect<
    readonly GlobalSquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listGlobalSquadGroupsEffect() {
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
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly characterCount: number | null;
          readonly groupId: number;
          readonly name: string;
          readonly ownerId: string;
          readonly ownerImage: string | null;
          readonly ownerName: string;
          readonly squadCount: number | null;
          readonly updatedAt: Date;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const groups: GlobalSquadGroupSummary[] = [];

      for (const row of rows) {
        const groupId = parseSquadGroupId(row.groupId);

        if (isError(groupId)) {
          return yield* failPersistence(operation, groupId.error);
        }

        const name = parseSquadGroupName(row.name);

        if (isError(name)) {
          return yield* failPersistence(operation, name.error);
        }

        const ownerUserId = yield* parsePersistedAppUserId(
          operation,
          row.ownerId
        );

        groups.push({
          characterCount: row.characterCount ?? 0,
          groupId: groupId.value,
          name: name.value,
          ownerUserId,
          ownerUserImage: row.ownerImage,
          ownerUserName: row.ownerName,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        });
      }

      return groups;
    });

const setSquadGroupVisibilityWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    groupId,
    now,
    visibility,
  }: SetSquadGroupVisibilityStoreInput): Effect.Effect<
    SquadGroupVisibilityChange,
    | SquadGroupNotFound
    | ActorDoesNotOwnSquadGroup
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* setSquadGroupVisibilityEffect() {
      const operation = "setSquadGroupVisibility" as const;
      const groupIdNumber = squadGroupIdToNumber(groupId);
      const select = database
        .select({
          ownerUserId: squadGroup.ownerUserId,
          updatedAt: squadGroup.updatedAt,
          visibility: squadGroup.visibility,
        })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNumber))
        .limit(1);
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly ownerUserId: string;
          readonly updatedAt: Date;
          readonly visibility: string;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [existing] = rows;

      if (existing === undefined) {
        return yield* Effect.fail({ _tag: "SquadGroupNotFound" as const });
      }

      if (existing.ownerUserId !== appUserIdToString(actorUserId)) {
        return yield* Effect.fail({
          _tag: "ActorDoesNotOwnSquadGroup" as const,
        });
      }

      if (existing.visibility === visibility) {
        return { groupId, updatedAt: existing.updatedAt, visibility };
      }

      const update = database
        .update(squadGroup)
        .set({ updatedAt: now, visibility })
        .where(eq(squadGroup.id, groupIdNumber))
        .returning({ updatedAt: squadGroup.updatedAt });
      const updateEffect = update as Effect.Effect<
        readonly { readonly updatedAt: Date }[],
        unknown,
        never
      >;
      const updatedRows = yield* updateEffect.pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const [updated] = updatedRows;

      if (updated === undefined) {
        return yield* failPersistence(
          operation,
          new Error("Failed to update squad group visibility")
        );
      }

      return { groupId, updatedAt: updated.updatedAt, visibility };
    });

export const DrizzleEffectSquadGroupStoreLayer: Layer.Layer<
  EffectSquadGroupStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectSquadGroupStore,
  EffectDatabase.useSync((database) =>
    EffectSquadGroupStore.of({
      createSquadGroup: createSquadGroupWithDatabase(database),
      getSquadGroupDetail: getSquadGroupDetailWithDatabase(database),
      listAvailableCharactersForOwner:
        listAvailableCharactersForOwnerWithDatabase(database),
      listGlobalSquadGroups: listGlobalSquadGroupsWithDatabase(database),
      listMySquadGroups: listMySquadGroupsWithDatabase(database),
      listOwnedAccounts: listOwnedAccountsWithDatabase(database),
      setSquadGroupVisibility: setSquadGroupVisibilityWithDatabase(database),
    })
  )
);
