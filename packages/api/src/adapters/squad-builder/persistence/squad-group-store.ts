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
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
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
import {
  appUserIdToString,
  parseAppUserId,
} from "../../../domain/squad-builder/app-user-id.ts";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../../../domain/squad-builder/margonem-character.ts";
import {
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "../../../domain/squad-builder/margonem-profile-id.ts";
import type { SquadGroupAccess } from "../../../domain/squad-builder/squad-group-access.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import {
  parseSquadGroupId,
  squadGroupIdToNumber,
} from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import {
  parseSquadGroupInvitationId,
  squadGroupInvitationIdToNumber,
} from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import type { SquadGroupInvitationStatus } from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import {
  canTransitionSquadGroupInvitation,
  parseSquadGroupInvitationStatus,
} from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import {
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "../../../domain/squad-builder/squad-group-list-filters.ts";
import { parseSquadGroupVisibility } from "../../../domain/squad-builder/squad-group-visibility.ts";
import { parseSquadId } from "../../../domain/squad-builder/squad-id.ts";
import {
  parseSquadGroupName,
  squadGroupNameToString,
  squadNameToString,
} from "../../../domain/squad-builder/squad-name.ts";
import {
  ActorCannotEditSquadGroup,
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  ActorIsNotSquadGroupInviteRecipient,
  EditorCannotChangeSquadStructure,
  EffectSquadBuilderPersistenceUnavailable,
  SquadCharacterNotAccessible,
  SquadEditorInviteTargetNotFound,
  SquadEditorInviteTargetNotVerified,
  SquadGroupInvitationNotFound,
  SquadGroupInvitationTransitionNotAllowed,
  SquadGroupNotFound,
  SquadNotInGroup,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import type {
  AvailableSquadCharacter,
  CreateSquadGroupStoreInput,
  GetSquadGroupDetailInput,
  GlobalSquadGroupSummary,
  ListAvailableCharactersForOwnerInput,
  ListGlobalSquadGroupsInput,
  ListMySquadGroupsInput,
  RespondToSquadGroupInviteStoreInput,
  RevokeSquadGroupEditorStoreInput,
  SaveSharedSquadGroupCharactersStoreInput,
  SaveSquadGroupSnapshotStoreInput,
  SearchSquadEditorInviteTargetsStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SharedSquadGroupSummary,
  SquadEditorInviteTarget,
  SquadGroupCharacter,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SquadGroupSummary,
  UpsertSquadGroupEditorInviteInput,
} from "../../../services/squad-builder/squad-groups/squad-group-store.ts";
import { SquadGroupStoreService } from "../../../services/squad-builder/squad-groups/squad-group-store.ts";
import {
  escapeLikePattern,
  failPersistence,
  namedStoreMethod,
  parsePersistedAppUserId,
  parsePersistedSquadGroupName,
  persistenceQuery,
} from "./persistence-query.ts";
import type { EffectSquadGroupPersistenceOperation } from "./persistence-query.ts";

const createSquadGroupWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createSquadGroupEffect({
    actorUserId,
    name,
  }: CreateSquadGroupStoreInput) {
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

    const createdRows = yield* persistenceQuery("createSquadGroup", insert);

    const [created] = createdRows;

    if (created === undefined) {
      return yield* failPersistence(
        "createSquadGroup",
        new Error("Failed to insert squad group")
      );
    }

    const groupId = yield* parseSquadGroupId(created.id).pipe(
      Effect.catch((error) => failPersistence("createSquadGroup", error))
    );

    return {
      characterCount: 0,
      groupId,
      name,
      squadCount: 0,
      updatedAt: created.updatedAt,
    };
  });

const listMySquadGroupsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listMySquadGroupsEffect({
    actorUserId,
  }: ListMySquadGroupsInput) {
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

    const rows = yield* persistenceQuery("listMySquadGroups", select);

    const groups: SquadGroupSummary[] = [];

    for (const row of rows) {
      const groupId = yield* parseSquadGroupId(row.groupId).pipe(
        Effect.catch((error) => failPersistence("listMySquadGroups", error))
      );

      const name = yield* parseSquadGroupName(row.name).pipe(
        Effect.catch((error) => failPersistence("listMySquadGroups", error))
      );

      groups.push({
        characterCount: row.characterCount ?? 0,
        groupId,
        name,
        squadCount: row.squadCount ?? 0,
        updatedAt: row.updatedAt,
      });
    }

    return groups;
  });

const authorizeSquadGroupOwnerWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* authorizeSquadGroupOwnerEffect({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
  }) {
    const operation = "authorizeSquadGroupOwner" as const;
    const select = database
      .select({ ownerUserId: squadGroup.ownerUserId })
      .from(squadGroup)
      .where(eq(squadGroup.id, squadGroupIdToNumber(groupId)))
      .limit(1);
    const rows = yield* persistenceQuery(operation, select);

    const [group] = rows;

    if (group === undefined) {
      return yield* new SquadGroupNotFound();
    }

    if (group.ownerUserId !== appUserIdToString(actorUserId)) {
      return yield* new ActorDoesNotOwnSquadGroup();
    }

    return {
      _tag: "SquadGroupOwnerAccess" as const,
      groupId,
      ownerUserId: actorUserId,
      role: "owner" as const,
    };
  });

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
    const groupIdNumber = squadGroupIdToNumber(groupId);
    const owner = appUserIdToString(ownerUserId);
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
      .where(eq(user.id, appUserIdToString(targetUserId)))
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

const loadSquadGroupInvitationSummaryWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* loadSquadGroupInvitationSummaryEffect(
    invitationId: SquadGroupInvitationId,
    operation: EffectSquadGroupPersistenceOperation
  ) {
    const select = database
      .select({
        createdAt: squadGroupInvitation.createdAt,
        invitationId: squadGroupInvitation.id,
        ownerId: user.id,
        ownerImage: user.image,
        ownerName: user.name,
        squadGroupId: squadGroup.id,
        squadGroupName: squadGroup.name,
        status: squadGroupInvitation.status,
        updatedAt: squadGroupInvitation.updatedAt,
      })
      .from(squadGroupInvitation)
      .innerJoin(
        squadGroup,
        eq(squadGroup.id, squadGroupInvitation.squadGroupId)
      )
      .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
      .where(
        eq(
          squadGroupInvitation.id,
          squadGroupInvitationIdToNumber(invitationId)
        )
      )
      .limit(1);
    const rows = yield* persistenceQuery(operation, select);

    const [row] = rows;

    if (row === undefined) {
      return yield* new SquadGroupInvitationNotFound();
    }

    const status = yield* parseSquadGroupInvitationStatus(row.status).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const persistedInvitationId = yield* parseSquadGroupInvitationId(
      row.invitationId
    ).pipe(Effect.catch((error) => failPersistence(operation, error)));

    const persistedGroupId = yield* parseSquadGroupId(row.squadGroupId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    const squadGroupName = yield* parsePersistedSquadGroupName(
      operation,
      row.squadGroupName
    );
    const ownerUserId = yield* parsePersistedAppUserId(operation, row.ownerId);

    return {
      createdAt: row.createdAt,
      invitationId: persistedInvitationId,
      ownerUserId,
      ownerUserImage: row.ownerImage,
      ownerUserName: row.ownerName,
      squadGroupId: persistedGroupId,
      squadGroupName,
      status,
      updatedAt: row.updatedAt,
    };
  });

const upsertSquadGroupEditorInviteWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* upsertSquadGroupEditorInviteEffect({
    groupId,
    invitedUserId,
    now,
    ownerUserId,
  }: UpsertSquadGroupEditorInviteInput) {
    const operation = "upsertSquadGroupEditorInvite" as const;
    const groupIdNumber = squadGroupIdToNumber(groupId);
    const invitedUser = appUserIdToString(invitedUserId);
    const owner = appUserIdToString(ownerUserId);
    const transaction = database.transaction(
      Effect.fnUntraced(function* upsertSquadGroupEditorInviteTransaction(
        tx: TransactionDatabase
      ) {
        const existingSelect = tx
          .select({
            id: squadGroupInvitation.id,
            status: squadGroupInvitation.status,
          })
          .from(squadGroupInvitation)
          .where(
            and(
              eq(squadGroupInvitation.squadGroupId, groupIdNumber),
              eq(squadGroupInvitation.invitedUserId, invitedUser)
            )
          )
          .limit(1);
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          const insert = tx
            .insert(squadGroupInvitation)
            .values({
              invitedByUserId: owner,
              invitedUserId: invitedUser,
              squadGroupId: groupIdNumber,
              status: "pending",
            })
            .returning({ id: squadGroupInvitation.id });
          const insertedRows = yield* insert;

          const [inserted] = insertedRows;

          if (inserted === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to insert squad group invitation")
            );
          }

          return inserted.id;
        }

        const status = yield* parseSquadGroupInvitationStatus(
          existing.status
        ).pipe(Effect.catch((error) => failPersistence(operation, error)));

        if (!canTransitionSquadGroupInvitation(status, "pending")) {
          return new SquadGroupInvitationTransitionNotAllowed({
            attempted: "pending",
            currentStatus: status,
          });
        }

        const update = tx
          .update(squadGroupInvitation)
          .set({ invitedByUserId: owner, status: "pending", updatedAt: now })
          .where(eq(squadGroupInvitation.id, existing.id))
          .returning({ id: squadGroupInvitation.id });
        const updatedRows = yield* update;

        const [updated] = updatedRows;

        if (updated === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to re-send squad group editor invite")
          );
        }

        return updated.id;
      })
    );
    const upserted = yield* persistenceQuery(operation, transaction);

    if (typeof upserted !== "number") {
      return yield* upserted;
    }

    const invitationId = yield* parseSquadGroupInvitationId(upserted).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
      invitationId,
      operation
    ).pipe(
      Effect.catchTag("SquadGroupInvitationNotFound", (error) =>
        failPersistence(operation, error)
      )
    );
  });

const respondToSquadGroupInviteWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* respondToSquadGroupInviteEffect({
    invitationId,
    invitedUserId,
    now,
    response,
  }: RespondToSquadGroupInviteStoreInput) {
    const operation = "respondToSquadGroupInvite" as const;
    const invitedUser = appUserIdToString(invitedUserId);
    const invitationIdNumber = squadGroupInvitationIdToNumber(invitationId);
    const transaction = database.transaction(
      Effect.fnUntraced(function* respondToSquadGroupInviteTransaction(
        tx: TransactionDatabase
      ) {
        const existingSelect = tx
          .select({
            id: squadGroupInvitation.id,
            invitedUserId: squadGroupInvitation.invitedUserId,
            status: squadGroupInvitation.status,
          })
          .from(squadGroupInvitation)
          .where(eq(squadGroupInvitation.id, invitationIdNumber))
          .limit(1);
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          return new SquadGroupInvitationNotFound();
        }

        if (existing.invitedUserId !== invitedUser) {
          return new ActorIsNotSquadGroupInviteRecipient();
        }

        const status = yield* parseSquadGroupInvitationStatus(
          existing.status
        ).pipe(Effect.catch((error) => failPersistence(operation, error)));

        const nextStatus: SquadGroupInvitationStatus =
          response === "accept" ? "accepted" : "declined";

        if (!canTransitionSquadGroupInvitation(status, nextStatus)) {
          return new SquadGroupInvitationTransitionNotAllowed({
            attempted: nextStatus,
            currentStatus: status,
          });
        }

        const update = tx
          .update(squadGroupInvitation)
          .set({ status: nextStatus, updatedAt: now })
          .where(eq(squadGroupInvitation.id, existing.id))
          .returning({ id: squadGroupInvitation.id });
        const updatedRows = yield* update;

        const [updated] = updatedRows;

        if (updated === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to update squad group invitation")
          );
        }

        return { _tag: "Updated" as const };
      })
    );
    const respond = yield* persistenceQuery(operation, transaction);

    if (respond._tag !== "Updated") {
      return yield* respond;
    }

    return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
      invitationId,
      operation
    );
  });

const revokeSquadGroupEditorWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* revokeSquadGroupEditorEffect({
    invitationId,
    now,
    ownerUserId,
  }: RevokeSquadGroupEditorStoreInput) {
    const operation = "revokeSquadGroupEditor" as const;
    const owner = appUserIdToString(ownerUserId);
    const invitationIdNumber = squadGroupInvitationIdToNumber(invitationId);
    const transaction = database.transaction(
      Effect.fnUntraced(function* revokeSquadGroupEditorTransaction(
        tx: TransactionDatabase
      ) {
        const existingSelect = tx
          .select({
            ownerUserId: squadGroup.ownerUserId,
            status: squadGroupInvitation.status,
          })
          .from(squadGroupInvitation)
          .innerJoin(
            squadGroup,
            eq(squadGroup.id, squadGroupInvitation.squadGroupId)
          )
          .where(eq(squadGroupInvitation.id, invitationIdNumber))
          .limit(1);
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          return new SquadGroupInvitationNotFound();
        }

        if (existing.ownerUserId !== owner) {
          return new ActorDoesNotOwnSquadGroup();
        }

        const status = yield* parseSquadGroupInvitationStatus(
          existing.status
        ).pipe(Effect.catch((error) => failPersistence(operation, error)));

        if (!canTransitionSquadGroupInvitation(status, "revoked")) {
          return new SquadGroupInvitationTransitionNotAllowed({
            attempted: "revoked",
            currentStatus: status,
          });
        }

        const update = tx
          .update(squadGroupInvitation)
          .set({ status: "revoked", updatedAt: now })
          .where(eq(squadGroupInvitation.id, invitationIdNumber))
          .returning({ id: squadGroupInvitation.id });
        const updatedRows = yield* update;

        const [updated] = updatedRows;

        if (updated === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to revoke squad group editor invite")
          );
        }

        return { _tag: "Revoked" as const };
      })
    );
    const revoked = yield* persistenceQuery(operation, transaction);

    if (revoked._tag !== "Revoked") {
      return yield* revoked;
    }

    return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
      invitationId,
      operation
    );
  });

const listIncomingSquadGroupInvitesWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* listIncomingSquadGroupInvitesEffect({
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
  }) {
    const operation = "listIncomingSquadGroupInvites" as const;
    const select = database
      .select({ id: squadGroupInvitation.id })
      .from(squadGroupInvitation)
      .where(
        and(
          eq(
            squadGroupInvitation.invitedUserId,
            appUserIdToString(actorUserId)
          ),
          eq(squadGroupInvitation.status, "pending")
        )
      )
      .orderBy(desc(squadGroupInvitation.createdAt));
    const rows = yield* persistenceQuery(operation, select);

    const invites: SquadGroupInvitationSummary[] = [];

    for (const row of rows) {
      const invitationId = yield* parseSquadGroupInvitationId(row.id).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const summary = yield* loadSquadGroupInvitationSummaryWithDatabase(
        database
      )(invitationId, operation).pipe(
        Effect.catchTag("SquadGroupInvitationNotFound", (error) =>
          failPersistence(operation, error)
        )
      );

      invites.push(summary);
    }

    return invites;
  });

const getPendingSquadGroupInviteCountWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* getPendingSquadGroupInviteCountEffect({
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
  }) {
    const operation = "getPendingSquadGroupInviteCount" as const;
    const select = database
      .select({ inviteCount: count() })
      .from(squadGroupInvitation)
      .where(
        and(
          eq(
            squadGroupInvitation.invitedUserId,
            appUserIdToString(actorUserId)
          ),
          eq(squadGroupInvitation.status, "pending")
        )
      );
    const rows = yield* persistenceQuery(operation, select);

    return rows[0]?.inviteCount ?? 0;
  });

const listSquadGroupEditorGrantsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listSquadGroupEditorGrantsEffect({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupSummary["groupId"];
  }) {
    const operation = "listSquadGroupEditorGrants" as const;
    yield* authorizeSquadGroupOwnerWithDatabase(database)({
      actorUserId,
      groupId,
    });

    const select = database
      .select({
        createdAt: squadGroupInvitation.createdAt,
        image: user.image,
        invitationId: squadGroupInvitation.id,
        name: user.name,
        status: squadGroupInvitation.status,
        updatedAt: squadGroupInvitation.updatedAt,
        userId: user.id,
      })
      .from(squadGroupInvitation)
      .innerJoin(user, eq(user.id, squadGroupInvitation.invitedUserId))
      .where(
        and(
          eq(squadGroupInvitation.squadGroupId, squadGroupIdToNumber(groupId)),
          inArray(squadGroupInvitation.status, ["pending", "accepted"])
        )
      )
      .orderBy(desc(squadGroupInvitation.createdAt));
    const rows = yield* persistenceQuery(operation, select);

    const grants: SquadGroupEditorGrantSummary[] = [];

    for (const row of rows) {
      const status = yield* parseSquadGroupInvitationStatus(row.status).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      if (status !== "pending" && status !== "accepted") {
        return yield* failPersistence(
          operation,
          new Error(`Unexpected squad group invitation status: ${status}`)
        );
      }

      const invitationId = yield* parseSquadGroupInvitationId(
        row.invitationId
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      const userId = yield* parsePersistedAppUserId(operation, row.userId);

      grants.push({
        createdAt: row.createdAt,
        invitationId,
        status,
        updatedAt: row.updatedAt,
        userId,
        userImage: row.image,
        userName: row.name,
      });
    }

    return grants;
  });

const listAvailableCharactersForOwnerWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* listAvailableCharactersForOwnerEffect({
    ownerUserId,
  }: ListAvailableCharactersForOwnerInput) {
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

const getSquadGroupDetailWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getSquadGroupDetailEffect({
    actorUserId,
    groupId,
  }: GetSquadGroupDetailInput) {
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
    const groupRows = yield* persistenceQuery(operation, groupSelect);

    const [group] = groupRows;

    if (group === undefined) {
      return yield* new SquadGroupNotFound();
    }

    const ownerUserId = yield* parsePersistedAppUserId(
      operation,
      group.ownerUserId
    );
    const groupName = yield* parsePersistedSquadGroupName(
      operation,
      group.name
    );
    const visibility = yield* parseSquadGroupVisibility(group.visibility).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

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
      const inviteRows = yield* persistenceQuery(operation, inviteSelect);

      const [invite] = inviteRows;

      if (invite === undefined) {
        if (visibility !== "global") {
          return yield* new ActorCannotViewSquadGroup();
        }

        access = {
          _tag: "SquadGroupViewerAccess",
          groupId,
          ownerUserId,
          role: "viewer",
        };
      } else {
        const invitationId = yield* parseSquadGroupInvitationId(invite.id).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );

        access = {
          _tag: "SquadGroupEditorAccess",
          editorUserId: actorUserId,
          groupId,
          invitationId,
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
    const squadRows = yield* persistenceQuery(operation, squadSelect);

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
    const placementRows = yield* persistenceQuery(operation, placementSelect);

    const charactersBySquadId = new Map<number, SquadGroupCharacter[]>();

    for (const placement of placementRows) {
      const current = charactersBySquadId.get(placement.squadId) ?? [];
      const accountDisplayName = yield* parseAccountDisplayName(
        placement.accountDisplayName
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      const accountId = yield* parseMargonemAccountId(placement.accountId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const level = yield* parsePositiveLevel(placement.level).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const profession = yield* parseMargonemProfession(
        placement.profession
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      const margonemCharacterId = yield* parseMargonemCharacterId(
        placement.margonemCharacterId
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      current.push({
        accountDisplayName,
        accountId,
        accountOwnerUserImage: placement.accountOwnerUserImage,
        accountOwnerUserName: placement.accountOwnerUserName,
        avatarUrl: placement.avatarUrl,
        characterId: placement.characterId,
        level,
        margonemCharacterId,
        name: placement.name,
        placementId: placement.placementId,
        position: placement.position,
        profession,
      });
      charactersBySquadId.set(placement.squadId, current);
    }

    const squads = [];

    for (const row of squadRows) {
      const squadId = yield* parseSquadId(row.id).pipe(
        Effect.catchTag("InvalidSquadId", (error) =>
          failPersistence(operation, error)
        )
      );

      squads.push({
        characters: charactersBySquadId.get(row.id) ?? [],
        name: row.name,
        position: row.position,
        squadId,
      });
    }

    return {
      accessRole: access.role,
      groupId,
      name: groupName,
      ownerUserId,
      squads,
      updatedAt: group.updatedAt,
      visibility,
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

const listSharedSquadGroupsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* listSharedSquadGroupsEffect({
    actorUserId,
    filters,
  }: {
    readonly actorUserId: AppUserId;
    readonly filters: ListGlobalSquadGroupsInput["filters"];
  }) {
    const operation = "listSharedSquadGroups" as const;
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
      .from(squadGroupInvitation)
      .innerJoin(
        squadGroup,
        eq(squadGroup.id, squadGroupInvitation.squadGroupId)
      )
      .innerJoin(user, eq(user.id, squadGroup.ownerUserId))
      .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
      .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
      .where(
        and(
          eq(
            squadGroupInvitation.invitedUserId,
            appUserIdToString(actorUserId)
          ),
          eq(squadGroupInvitation.status, "accepted"),
          ...filterPredicates
        )
      )
      .groupBy(squadGroup.id, user.id)
      .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id));
    const rows = yield* persistenceQuery(operation, select);

    const groups: SharedSquadGroupSummary[] = [];

    for (const row of rows) {
      const groupId = yield* parseSquadGroupId(row.groupId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const name = yield* parsePersistedSquadGroupName(operation, row.name);
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

const saveSharedSquadGroupCharactersWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* saveSharedSquadGroupCharactersEffect({
    actorUserId,
    groupId,
    now,
    snapshot,
  }: SaveSharedSquadGroupCharactersStoreInput) {
    const operation = "saveSharedSquadGroupCharacters" as const;
    const groupIdNumber = squadGroupIdToNumber(groupId);
    const actor = appUserIdToString(actorUserId);
    const transaction = database.transaction(
      Effect.fnUntraced(function* saveSharedSquadGroupCharactersTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
        );

        const groupSelect = tx
          .select({ ownerUserId: squadGroup.ownerUserId })
          .from(squadGroup)
          .where(eq(squadGroup.id, groupIdNumber))
          .limit(1);
        const groupRows = yield* groupSelect;

        const [group] = groupRows;

        if (group === undefined) {
          return new SquadGroupNotFound();
        }

        if (group.ownerUserId !== actor) {
          const inviteSelect = tx
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
          const inviteRows = yield* inviteSelect;

          if (inviteRows[0] === undefined) {
            return new ActorCannotEditSquadGroup();
          }
        }

        const existingSquadSelect = tx
          .select({ id: squad.id })
          .from(squad)
          .where(eq(squad.squadGroupId, groupIdNumber));
        const existingSquads = yield* existingSquadSelect;

        const existingSquadIds = new Set(existingSquads.map((row) => row.id));

        if (existingSquadIds.size !== snapshot.squads.length) {
          return new EditorCannotChangeSquadStructure();
        }

        for (const submitted of snapshot.squads) {
          if (!existingSquadIds.has(submitted.squadId)) {
            return new SquadNotInGroup({ squadId: submitted.squadId });
          }
        }

        yield* tx
          .delete(squadCharacter)
          .where(eq(squadCharacter.squadGroupId, groupIdNumber));

        const characterIds = snapshot.squads.flatMap((item) =>
          item.characters.map((character) => character.characterId)
        );
        const charactersById = new Map<
          number,
          { readonly accountId: number }
        >();

        if (characterIds.length > 0) {
          const characterSelect = tx
            .select({
              accountId: margonemCharacter.accountId,
              id: margonemCharacter.id,
            })
            .from(margonemCharacter)
            .where(inArray(margonemCharacter.id, characterIds));
          const characterRows = yield* characterSelect;

          for (const character of characterRows) {
            charactersById.set(character.id, {
              accountId: character.accountId,
            });
          }
        }

        const placements = [];

        for (const submitted of snapshot.squads) {
          for (const character of submitted.characters) {
            const stored = charactersById.get(character.characterId);

            if (stored === undefined) {
              return new SquadCharacterNotAccessible({
                characterId: character.characterId,
              });
            }

            placements.push({
              accountId: stored.accountId,
              characterId: character.characterId,
              position: character.position,
              squadGroupId: groupIdNumber,
              squadId: submitted.squadId,
            });
          }
        }

        if (placements.length > 0) {
          yield* tx.insert(squadCharacter).values(placements);
        }

        yield* tx
          .update(squadGroup)
          .set({ updatedAt: now })
          .where(eq(squadGroup.id, groupIdNumber));

        return { _tag: "Saved" as const };
      })
    );

    const saved = yield* persistenceQuery(operation, transaction);

    if (saved._tag !== "Saved") {
      return yield* saved;
    }

    return yield* getSquadGroupDetailWithDatabase(database)({
      actorUserId,
      groupId,
    }).pipe(
      Effect.catch(
        (
          error
        ): Effect.Effect<
          never,
          | SquadGroupNotFound
          | ActorCannotEditSquadGroup
          | EffectSquadBuilderPersistenceUnavailable
        > => {
          if (error._tag === "ActorCannotViewSquadGroup") {
            return new ActorCannotEditSquadGroup();
          }

          return Effect.fail(error);
        }
      )
    );
  });

const saveSquadGroupSnapshotWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* saveSquadGroupSnapshotEffect({
    actorUserId,
    availableCharacters,
    now,
    snapshot,
  }: SaveSquadGroupSnapshotStoreInput) {
    const operation = "saveSquadGroupSnapshot" as const;
    const groupIdNumber = squadGroupIdToNumber(snapshot.groupId);
    const availableByCharacterId = new Map<number, AvailableSquadCharacter>();

    for (const character of availableCharacters) {
      availableByCharacterId.set(character.characterId, character);
    }

    const transaction = database.transaction(
      Effect.fnUntraced(function* saveSquadGroupSnapshotTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
        );

        const groupSelect = tx
          .select({ ownerUserId: squadGroup.ownerUserId })
          .from(squadGroup)
          .where(eq(squadGroup.id, groupIdNumber))
          .limit(1);
        const groupRows = yield* groupSelect;

        const [group] = groupRows;

        if (group === undefined) {
          return new SquadGroupNotFound();
        }

        if (group.ownerUserId !== appUserIdToString(actorUserId)) {
          return new ActorDoesNotOwnSquadGroup();
        }

        yield* tx
          .update(squadGroup)
          .set({
            name: squadGroupNameToString(snapshot.name),
            updatedAt: now,
          })
          .where(eq(squadGroup.id, groupIdNumber));

        yield* tx.delete(squad).where(eq(squad.squadGroupId, groupIdNumber));

        for (const squadSnapshot of snapshot.squads) {
          const insertSquad = tx
            .insert(squad)
            .values({
              name: squadNameToString(squadSnapshot.name),
              position: squadSnapshot.position,
              squadGroupId: groupIdNumber,
              updatedAt: now,
            })
            .returning({ id: squad.id });
          const insertedSquadRows = yield* insertSquad;

          const [insertedSquad] = insertedSquadRows;

          if (insertedSquad === undefined) {
            return new EffectSquadBuilderPersistenceUnavailable({
              cause: new Error("Failed to insert squad"),
              operation,
              provider: "postgres",
            });
          }

          if (squadSnapshot.characters.length === 0) {
            continue;
          }

          const placementRows = [];

          for (const placement of squadSnapshot.characters) {
            const character = availableByCharacterId.get(placement.characterId);

            if (character === undefined) {
              return new EffectSquadBuilderPersistenceUnavailable({
                cause: new Error("Validated character was not available"),
                operation,
                provider: "postgres",
              });
            }

            placementRows.push({
              accountId: margonemAccountIdToNumber(character.accountId),
              characterId: placement.characterId,
              position: placement.position,
              squadGroupId: groupIdNumber,
              squadId: insertedSquad.id,
            });
          }

          yield* tx.insert(squadCharacter).values(placementRows);
        }

        return { _tag: "Saved" as const };
      })
    );

    const saved = yield* persistenceQuery(operation, transaction);

    if (saved._tag !== "Saved") {
      return yield* saved;
    }

    return yield* getSquadGroupDetailWithDatabase(database)({
      actorUserId,
      groupId: snapshot.groupId,
    }).pipe(
      Effect.catch(
        (
          error
        ): Effect.Effect<
          never,
          | SquadGroupNotFound
          | ActorDoesNotOwnSquadGroup
          | EffectSquadBuilderPersistenceUnavailable
        > => {
          if (error._tag === "ActorCannotViewSquadGroup") {
            return new ActorDoesNotOwnSquadGroup();
          }

          return Effect.fail(error);
        }
      )
    );
  });

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

const setSquadGroupVisibilityWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* setSquadGroupVisibilityEffect({
    actorUserId,
    groupId,
    now,
    visibility,
  }: SetSquadGroupVisibilityStoreInput) {
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
    const rows = yield* persistenceQuery(operation, select);

    const [existing] = rows;

    if (existing === undefined) {
      return yield* new SquadGroupNotFound();
    }

    if (existing.ownerUserId !== appUserIdToString(actorUserId)) {
      return yield* new ActorDoesNotOwnSquadGroup();
    }

    if (existing.visibility === visibility) {
      return { groupId, updatedAt: existing.updatedAt, visibility };
    }

    const update = database
      .update(squadGroup)
      .set({ updatedAt: now, visibility })
      .where(eq(squadGroup.id, groupIdNumber))
      .returning({ updatedAt: squadGroup.updatedAt });
    const updatedRows = yield* persistenceQuery(operation, update);

    const [updated] = updatedRows;

    if (updated === undefined) {
      return yield* failPersistence(
        operation,
        new Error("Failed to update squad group visibility")
      );
    }

    return { groupId, updatedAt: updated.updatedAt, visibility };
  });

export const DrizzleSquadGroupStoreServiceLayer: Layer.Layer<
  SquadGroupStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  SquadGroupStoreService,
  EffectDatabase.useSync((database) =>
    SquadGroupStoreService.of({
      authorizeSquadGroupOwner: namedStoreMethod(
        "SquadGroupStore.authorizeSquadGroupOwner",
        authorizeSquadGroupOwnerWithDatabase(database)
      ),
      createSquadGroup: namedStoreMethod(
        "SquadGroupStore.createSquadGroup",
        createSquadGroupWithDatabase(database)
      ),
      findVerifiedSquadEditorInviteTarget: namedStoreMethod(
        "SquadGroupStore.findVerifiedSquadEditorInviteTarget",
        findVerifiedSquadEditorInviteTargetWithDatabase(database)
      ),
      getPendingSquadGroupInviteCount: namedStoreMethod(
        "SquadGroupStore.getPendingSquadGroupInviteCount",
        getPendingSquadGroupInviteCountWithDatabase(database)
      ),
      getSquadGroupDetail: namedStoreMethod(
        "SquadGroupStore.getSquadGroupDetail",
        getSquadGroupDetailWithDatabase(database)
      ),
      listAvailableCharactersForOwner: namedStoreMethod(
        "SquadGroupStore.listAvailableCharactersForOwner",
        listAvailableCharactersForOwnerWithDatabase(database)
      ),
      listGlobalSquadGroups: namedStoreMethod(
        "SquadGroupStore.listGlobalSquadGroups",
        listGlobalSquadGroupsWithDatabase(database)
      ),
      listIncomingSquadGroupInvites: namedStoreMethod(
        "SquadGroupStore.listIncomingSquadGroupInvites",
        listIncomingSquadGroupInvitesWithDatabase(database)
      ),
      listMySquadGroups: namedStoreMethod(
        "SquadGroupStore.listMySquadGroups",
        listMySquadGroupsWithDatabase(database)
      ),
      listSharedSquadGroups: namedStoreMethod(
        "SquadGroupStore.listSharedSquadGroups",
        listSharedSquadGroupsWithDatabase(database)
      ),
      listSquadGroupEditorGrants: namedStoreMethod(
        "SquadGroupStore.listSquadGroupEditorGrants",
        listSquadGroupEditorGrantsWithDatabase(database)
      ),
      respondToSquadGroupInvite: namedStoreMethod(
        "SquadGroupStore.respondToSquadGroupInvite",
        respondToSquadGroupInviteWithDatabase(database)
      ),
      revokeSquadGroupEditor: namedStoreMethod(
        "SquadGroupStore.revokeSquadGroupEditor",
        revokeSquadGroupEditorWithDatabase(database)
      ),
      saveSharedSquadGroupCharacters: namedStoreMethod(
        "SquadGroupStore.saveSharedSquadGroupCharacters",
        saveSharedSquadGroupCharactersWithDatabase(database)
      ),
      saveSquadGroupSnapshot: namedStoreMethod(
        "SquadGroupStore.saveSquadGroupSnapshot",
        saveSquadGroupSnapshotWithDatabase(database)
      ),
      searchSquadEditorInviteTargets: namedStoreMethod(
        "SquadGroupStore.searchSquadEditorInviteTargets",
        searchSquadEditorInviteTargetsWithDatabase(database)
      ),
      setSquadGroupVisibility: namedStoreMethod(
        "SquadGroupStore.setSquadGroupVisibility",
        setSquadGroupVisibilityWithDatabase(database)
      ),
      upsertSquadGroupEditorInvite: namedStoreMethod(
        "SquadGroupStore.upsertSquadGroupEditorInvite",
        upsertSquadGroupEditorInviteWithDatabase(database)
      ),
    })
  )
);
