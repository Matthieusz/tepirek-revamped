import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { SquadGroupAccess } from "../../../domain/squad-builder/squad-group-access.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupInvitationStatus } from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import type { ListGlobalSquadGroupsInput } from "../../../services/squad-builder/squad-groups/squad-group-directory-store.ts";
import {
  ActorDoesNotOwnSquadGroup,
  SquadGroupNotFound,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import type {
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SharedSquadGroupSummary,
} from "../../../services/squad-builder/squad-groups/squad-group-sharing-store.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  parsePersistedSquadGroupName,
  persistenceQuery,
} from "./persistence-query.ts";
import { buildSquadGroupListFilterPredicates } from "./squad-group-directory-store.ts";

/** Verify ownership and return the owner's group access. */
export const authorizeSquadGroupOwnerWithDatabase = (
  database: EffectPgDatabase
) =>
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
      .where(eq(squadGroup.id, groupId))
      .limit(1);
    const rows = yield* persistenceQuery(operation, select);

    const [group] = rows;

    if (group === undefined) {
      return yield* new SquadGroupNotFound();
    }

    if (group.ownerUserId !== actorUserId) {
      return yield* new ActorDoesNotOwnSquadGroup();
    }

    return SquadGroupAccess.SquadGroupOwnerAccess({
      groupId,
      ownerUserId: actorUserId,
      role: "owner",
    });
  });

/** Load pending squad-group invitations addressed to a user. */
export const listIncomingSquadGroupInvitesWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* listIncomingSquadGroupInvitesEffect({
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
  }) {
    const operation = "listIncomingSquadGroupInvites" as const;
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
        and(
          eq(squadGroupInvitation.invitedUserId, actorUserId),
          eq(squadGroupInvitation.status, "pending")
        )
      )
      .orderBy(
        desc(squadGroupInvitation.createdAt),
        desc(squadGroupInvitation.id)
      );
    const rows = yield* persistenceQuery(operation, select);

    const invites: SquadGroupInvitationSummary[] = [];

    for (const row of rows) {
      const invitationId = yield* parseSquadGroupInvitationId(
        row.invitationId
      ).pipe(Effect.catch((error) => failPersistence(operation, error)));

      const status = yield* parseSquadGroupInvitationStatus(row.status).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const squadGroupId = yield* parseSquadGroupId(row.squadGroupId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );
      const squadGroupName = yield* parsePersistedSquadGroupName(
        operation,
        row.squadGroupName
      );
      const ownerUserId = yield* parsePersistedAppUserId(
        operation,
        row.ownerId
      );

      invites.push({
        createdAt: row.createdAt,
        invitationId,
        ownerUserId,
        ownerUserImage: row.ownerImage,
        ownerUserName: row.ownerName,
        squadGroupId,
        squadGroupName,
        status,
        updatedAt: row.updatedAt,
      });
    }

    return invites;
  });

/** Count pending squad-group invitations for a user. */
export const getPendingSquadGroupInviteCountWithDatabase = (
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
          eq(squadGroupInvitation.invitedUserId, actorUserId),
          eq(squadGroupInvitation.status, "pending")
        )
      );
    const rows = yield* persistenceQuery(operation, select);

    return rows[0]?.inviteCount ?? 0;
  });

/** Load active editor grants for a group owner. */
export const listSquadGroupEditorGrantsWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* listSquadGroupEditorGrantsEffect({
    actorUserId,
    groupId,
  }: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
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
          eq(squadGroupInvitation.squadGroupId, groupId),
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

/** Load the groups currently shared with a user. */
export const listSharedSquadGroupsWithDatabase = (database: EffectPgDatabase) =>
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
          eq(squadGroupInvitation.invitedUserId, actorUserId),
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
