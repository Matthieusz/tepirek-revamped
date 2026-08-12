import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { InvitationAccessStatus } from "../../../domain/squad-builder/invitation-access-lifecycle.ts";
import { SquadGroupAccess } from "../../../domain/squad-builder/squad-group-access.ts";
import type { SquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import type { SquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupInvitationStatus } from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import {
  parseSquadGroupSnapshot,
  validateParsedSquadGroupSnapshot,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { parseSquadId } from "../../../domain/squad-builder/squad-id.ts";
import type { ListGlobalSquadGroupsInput } from "../../../services/squad-builder/squad-groups/squad-group-directory-store.ts";
import {
  ActorDoesNotOwnSquadGroup,
  ActorIsNotSquadGroupInviteRecipient,
  ActorCannotEditSquadGroup,
  EditorCannotChangeSquadStructure,
  SquadBuilderPersistenceUnavailable,
  SquadGroupInvitationNotFound,
  SquadGroupInvitationTransitionNotAllowed,
  SquadGroupNotFound,
  SquadGroupWriteConflict,
  SquadNotInGroup,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import type {
  SaveSharedSquadGroupCharactersStoreInput,
  SquadGroupEditorGrantSummary,
  SquadGroupInvitationSummary,
  SharedSquadGroupSummary,
  UpsertSquadGroupEditorInviteInput,
  RespondToSquadGroupInviteStoreInput,
  RevokeSquadGroupEditorStoreInput,
} from "../../../services/squad-builder/squad-groups/squad-group-sharing-store.ts";
import { SquadGroupSharingStoreService } from "../../../services/squad-builder/squad-groups/squad-group-sharing-store.ts";
import { transitionInvitationAccessRow } from "./invitation-access-lifecycle.ts";
import type { EffectSquadGroupPersistenceOperation } from "./persistence-query.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  parsePersistedSquadGroupName,
  persistenceQuery,
} from "./persistence-query.ts";
import {
  buildSquadGroupListFilterPredicates,
  listAvailableCharactersForOwnerWithDatabase,
} from "./squad-group-directory-store.ts";

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
      .where(eq(squadGroupInvitation.id, invitationId))
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
    const groupIdNumber = groupId;
    const invitedUser = invitedUserId;
    const owner = ownerUserId;
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

        const transitioned = yield* transitionInvitationAccessRow({
          currentStatus: existing.status,
          nextStatus: "pending",
          onTransitionNotAllowed: ({ attempted, currentStatus }) =>
            new SquadGroupInvitationTransitionNotAllowed({
              attempted,
              currentStatus,
            }),
          parseStatus: (value) =>
            parseSquadGroupInvitationStatus(value).pipe(
              Effect.catch((error) => failPersistence(operation, error))
            ),
          update: (nextStatus) =>
            tx
              .update(squadGroupInvitation)
              .set({
                invitedByUserId: owner,
                status: nextStatus,
                updatedAt: now,
              })
              .where(eq(squadGroupInvitation.id, existing.id))
              .returning({ id: squadGroupInvitation.id }),
        });
        const [updated] = transitioned.result;

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
    const invitedUser = invitedUserId;
    const invitationIdNumber = invitationId;
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
          return yield* new SquadGroupInvitationNotFound();
        }

        if (existing.invitedUserId !== invitedUser) {
          return yield* new ActorIsNotSquadGroupInviteRecipient();
        }

        const nextStatus: InvitationAccessStatus =
          response === "accept" ? "accepted" : "declined";

        const transitioned = yield* transitionInvitationAccessRow({
          currentStatus: existing.status,
          nextStatus,
          onTransitionNotAllowed: ({ attempted, currentStatus }) =>
            new SquadGroupInvitationTransitionNotAllowed({
              attempted,
              currentStatus,
            }),
          parseStatus: (value) =>
            parseSquadGroupInvitationStatus(value).pipe(
              Effect.catch((error) => failPersistence(operation, error))
            ),
          update: (status) =>
            tx
              .update(squadGroupInvitation)
              .set({ status, updatedAt: now })
              .where(eq(squadGroupInvitation.id, existing.id))
              .returning({ id: squadGroupInvitation.id }),
        });
        const [updated] = transitioned.result;

        if (updated === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to update squad group invitation")
          );
        }

        return { _tag: "Updated" as const };
      })
    );
    yield* persistenceQuery(operation, transaction);

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
    const owner = ownerUserId;
    const invitationIdNumber = invitationId;
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
          return yield* new SquadGroupInvitationNotFound();
        }

        if (existing.ownerUserId !== owner) {
          return yield* new ActorDoesNotOwnSquadGroup();
        }

        const transitioned = yield* transitionInvitationAccessRow({
          currentStatus: existing.status,
          nextStatus: "revoked",
          onTransitionNotAllowed: ({ attempted, currentStatus }) =>
            new SquadGroupInvitationTransitionNotAllowed({
              attempted,
              currentStatus,
            }),
          parseStatus: (value) =>
            parseSquadGroupInvitationStatus(value).pipe(
              Effect.catch((error) => failPersistence(operation, error))
            ),
          update: (status) =>
            tx
              .update(squadGroupInvitation)
              .set({ status, updatedAt: now })
              .where(eq(squadGroupInvitation.id, invitationIdNumber))
              .returning({ id: squadGroupInvitation.id }),
        });
        const [updated] = transitioned.result;

        if (updated === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to revoke squad group editor invite")
          );
        }

        return { _tag: "Revoked" as const };
      })
    );
    yield* persistenceQuery(operation, transaction);

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
          eq(squadGroupInvitation.invitedUserId, actorUserId),
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

const saveSharedSquadGroupCharactersWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* saveSharedSquadGroupCharactersEffect({
    actorUserId,
    expectedUpdatedAt,
    groupId,
    now,
    snapshot,
  }: SaveSharedSquadGroupCharactersStoreInput) {
    const operation = "saveSharedSquadGroupCharacters" as const;
    const groupIdNumber = groupId;
    const actor = actorUserId;
    const transaction = database.transaction(
      Effect.fnUntraced(function* saveSharedSquadGroupCharactersTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
        );

        const groupSelect = tx
          .select({
            name: squadGroup.name,
            ownerUserId: squadGroup.ownerUserId,
            updatedAt: squadGroup.updatedAt,
          })
          .from(squadGroup)
          .where(eq(squadGroup.id, groupIdNumber))
          .limit(1)
          .for("update");
        const groupRows = yield* groupSelect;

        const [group] = groupRows;

        if (group === undefined) {
          return yield* new SquadGroupNotFound();
        }

        if (group.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
          return yield* new SquadGroupWriteConflict();
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
            return yield* new ActorCannotEditSquadGroup();
          }
        }

        const existingSquadSelect = tx
          .select({
            id: squad.id,
            name: squad.name,
            position: squad.position,
          })
          .from(squad)
          .where(eq(squad.squadGroupId, groupIdNumber));
        const existingSquads = yield* existingSquadSelect;

        const existingSquadIds = HashSet.fromIterable(
          existingSquads.map((row) => row.id)
        );
        const submittedSquadIds = HashSet.fromIterable(
          snapshot.squads.map((item) => item.squadId)
        );

        if (
          HashSet.size(existingSquadIds) !== snapshot.squads.length ||
          HashSet.size(submittedSquadIds) !== HashSet.size(existingSquadIds)
        ) {
          return yield* new EditorCannotChangeSquadStructure();
        }

        const submittedBySquadId = HashMap.fromIterable(
          snapshot.squads.map((item) => [item.squadId, item] as const)
        );
        for (const submitted of snapshot.squads) {
          const parsedSubmittedSquadId = yield* parseSquadId(
            submitted.squadId
          ).pipe(Effect.catch((error) => failPersistence(operation, error)));
          if (!HashSet.has(existingSquadIds, parsedSubmittedSquadId)) {
            return yield* new SquadNotInGroup({
              squadId: parsedSubmittedSquadId,
            });
          }
        }

        const parsedGroupId = yield* parseSquadGroupId(groupIdNumber).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );
        const ownerUserId = yield* parsePersistedAppUserId(
          operation,
          group.ownerUserId
        );
        const squadsForValidation = [];
        for (const existingSquad of existingSquads) {
          const parsedSquadId = yield* parseSquadId(existingSquad.id).pipe(
            Effect.catch((error) => failPersistence(operation, error))
          );
          const submitted = HashMap.get(submittedBySquadId, parsedSquadId).pipe(
            Option.getOrUndefined
          );
          squadsForValidation.push({
            characters: submitted?.characters ?? [],
            clientKey: `squad-${existingSquad.id}`,
            name: existingSquad.name,
            position: existingSquad.position,
            squadId: parsedSquadId,
          });
        }
        const snapshotForValidation = yield* parseSquadGroupSnapshot({
          groupId: parsedGroupId,
          name: group.name,
          squads: squadsForValidation,
        });
        const availableCharacters =
          yield* listAvailableCharactersForOwnerWithDatabase(
            tx,
            operation,
            true
          )({
            ownerUserId,
          });
        const validatedSnapshot = yield* validateParsedSquadGroupSnapshot({
          availableCharacters,
          snapshot: snapshotForValidation,
        });
        const availableByCharacterId = HashMap.fromIterable(
          availableCharacters.map(
            (character) => [character.characterId, character] as const
          )
        );

        yield* tx
          .delete(squadCharacter)
          .where(eq(squadCharacter.squadGroupId, groupIdNumber));

        const placements = [];

        for (const submitted of validatedSnapshot.squads) {
          for (const character of submitted.characters) {
            const stored = HashMap.get(
              availableByCharacterId,
              character.characterId
            ).pipe(Option.getOrUndefined);

            if (stored === undefined) {
              return yield* new SquadBuilderPersistenceUnavailable({
                cause: new Error("Validated character was not available"),
                operation,
                provider: "postgres",
              });
            }

            if (submitted.squadId === undefined) {
              return yield* new EditorCannotChangeSquadStructure();
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

    yield* persistenceQuery(operation, transaction);
  });

/** Provide the squad-group sharing store with its Drizzle implementation. */
export const DrizzleSquadGroupSharingStoreServiceLayer: Layer.Layer<
  SquadGroupSharingStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  SquadGroupSharingStoreService,
  EffectDatabase.useSync((database) =>
    SquadGroupSharingStoreService.of({
      authorizeSquadGroupOwner: Effect.fn(
        "SquadGroupSharingStore.authorizeSquadGroupOwner"
      )(authorizeSquadGroupOwnerWithDatabase(database)),
      getPendingSquadGroupInviteCount: Effect.fn(
        "SquadGroupSharingStore.getPendingSquadGroupInviteCount"
      )(getPendingSquadGroupInviteCountWithDatabase(database)),
      listIncomingSquadGroupInvites: Effect.fn(
        "SquadGroupSharingStore.listIncomingSquadGroupInvites"
      )(listIncomingSquadGroupInvitesWithDatabase(database)),
      listSharedSquadGroups: Effect.fn(
        "SquadGroupSharingStore.listSharedSquadGroups"
      )(listSharedSquadGroupsWithDatabase(database)),
      listSquadGroupEditorGrants: Effect.fn(
        "SquadGroupSharingStore.listSquadGroupEditorGrants"
      )(listSquadGroupEditorGrantsWithDatabase(database)),
      respondToSquadGroupInvite: Effect.fn(
        "SquadGroupSharingStore.respondToSquadGroupInvite"
      )(respondToSquadGroupInviteWithDatabase(database)),
      revokeSquadGroupEditor: Effect.fn(
        "SquadGroupSharingStore.revokeSquadGroupEditor"
      )(revokeSquadGroupEditorWithDatabase(database)),
      saveSharedSquadGroupCharacters: Effect.fn(
        "SquadGroupSharingStore.saveSharedSquadGroupCharacters"
      )(saveSharedSquadGroupCharactersWithDatabase(database)),
      upsertSquadGroupEditorInvite: Effect.fn(
        "SquadGroupSharingStore.upsertSquadGroupEditorInvite"
      )(upsertSquadGroupEditorInviteWithDatabase(database)),
    })
  )
);
