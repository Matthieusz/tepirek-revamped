import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import {
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";

import type { InvitationAccessStatus } from "../../../domain/squad-builder/invitation-access-lifecycle.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupInvitationStatus } from "../../../domain/squad-builder/squad-group-invitation-status.ts";
import {
  parseSquadGroupSnapshot,
  validateParsedSquadGroupSnapshot,
} from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { parseSquadId } from "../../../domain/squad-builder/squad-id.ts";
import {
  ActorCannotEditSquadGroup,
  ActorDoesNotOwnSquadGroup,
  ActorIsNotSquadGroupInviteRecipient,
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
  UpsertSquadGroupEditorInviteInput,
  RespondToSquadGroupInviteStoreInput,
  RevokeSquadGroupEditorStoreInput,
} from "../../../services/squad-builder/squad-groups/squad-group-sharing-store.ts";
import { validateInvitationAccessTransition } from "./invitation-access-lifecycle.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  persistenceQuery,
} from "./persistence-query.ts";
import { loadSquadGroupDetailWithDatabase } from "./squad-group-aggregate-store.ts";
import { listAvailableCharactersForOwnerWithDatabase } from "./squad-group-directory-store.ts";
import { loadSquadGroupInvitationSummaryWithDatabase } from "./squad-group-sharing-projections.ts";

/** Create or re-send a squad-group editor invitation atomically. */
export const upsertSquadGroupEditorInviteWithDatabase = (
  database: EffectPgDatabase
) =>
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
        const insert = tx
          .insert(squadGroupInvitation)
          .values({
            invitedByUserId: owner,
            invitedUserId: invitedUser,
            squadGroupId: groupIdNumber,
            status: "pending",
          })
          .onConflictDoNothing({
            target: [
              squadGroupInvitation.squadGroupId,
              squadGroupInvitation.invitedUserId,
            ],
          })
          .returning({ id: squadGroupInvitation.id });
        const insertedRows = yield* insert;

        const [inserted] = insertedRows;

        if (inserted !== undefined) {
          return inserted.id;
        }

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
          .limit(1)
          .for("update");
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to load conflicting squad group invitation")
          );
        }

        const transitioned = yield* validateInvitationAccessTransition({
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
        });
        const updatedRows = yield* tx
          .update(squadGroupInvitation)
          .set({
            invitedByUserId: owner,
            status: transitioned.nextStatus,
            updatedAt: now,
          })
          .where(eq(squadGroupInvitation.id, existing.id))
          .returning({ id: squadGroupInvitation.id });
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

/** Accept or decline a squad-group invitation atomically. */
export const respondToSquadGroupInviteWithDatabase = (
  database: EffectPgDatabase
) =>
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
          .limit(1)
          .for("update");
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

        const transitioned = yield* validateInvitationAccessTransition({
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
        });
        const updatedRows = yield* tx
          .update(squadGroupInvitation)
          .set({ status: transitioned.nextStatus, updatedAt: now })
          .where(eq(squadGroupInvitation.id, existing.id))
          .returning({ id: squadGroupInvitation.id });
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
    yield* persistenceQuery(operation, transaction);

    return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
      invitationId,
      operation
    );
  });

/** Revoke a squad-group editor invitation atomically. */
export const revokeSquadGroupEditorWithDatabase = (
  database: EffectPgDatabase
) =>
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
          .limit(1)
          .for("update", { of: squadGroupInvitation });
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing === undefined) {
          return yield* new SquadGroupInvitationNotFound();
        }

        if (existing.ownerUserId !== owner) {
          return yield* new ActorDoesNotOwnSquadGroup();
        }

        const transitioned = yield* validateInvitationAccessTransition({
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
        });
        const updatedRows = yield* tx
          .update(squadGroupInvitation)
          .set({ status: transitioned.nextStatus, updatedAt: now })
          .where(eq(squadGroupInvitation.id, invitationIdNumber))
          .returning({ id: squadGroupInvitation.id });
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
    yield* persistenceQuery(operation, transaction);

    return yield* loadSquadGroupInvitationSummaryWithDatabase(database)(
      invitationId,
      operation
    );
  });

/** Save shared group character placements under the group write lock. */
export const saveSharedSquadGroupCharactersWithDatabase = (
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
        yield* tx.execute(sql`set transaction isolation level repeatable read`);
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

        return yield* loadSquadGroupDetailWithDatabase(tx)({
          actorUserId,
          groupId,
        });
      })
    );

    return yield* persistenceQuery(operation, transaction);
  });

/** Provide the squad-group sharing store with its Drizzle implementation. */
