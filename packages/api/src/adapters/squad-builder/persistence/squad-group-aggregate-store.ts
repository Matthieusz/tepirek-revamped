import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  margonemAccount,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfession } from "../../../domain/squad-builder/margonem-character.ts";
import {
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "../../../domain/squad-builder/margonem-profile-id.ts";
import { SquadGroupAccess } from "../../../domain/squad-builder/squad-group-access.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { validateParsedSquadGroupSnapshot } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { parseSquadGroupVisibility } from "../../../domain/squad-builder/squad-group-visibility.ts";
import { parseSquadId } from "../../../domain/squad-builder/squad-id.ts";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import type {
  CreateSquadGroupStoreInput,
  DeleteSquadGroupStoreInput,
  GetSquadGroupDetailInput,
  ListMySquadGroupsInput,
  SaveSquadGroupSnapshotStoreInput,
  SetSquadGroupVisibilityStoreInput,
  SquadGroupCharacter,
  SquadGroupSummary,
} from "../../../services/squad-builder/squad-groups/squad-group-aggregate-store.ts";
import { SquadGroupAggregateStoreService } from "../../../services/squad-builder/squad-groups/squad-group-aggregate-store.ts";
import {
  ActorCannotViewSquadGroup,
  ActorDoesNotOwnSquadGroup,
  SquadBuilderPersistenceUnavailable,
  SquadGroupNotFound,
  SquadGroupWriteConflict,
  SquadNotInGroup,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import {
  failPersistence,
  parsePersistedAppUserId,
  parsePersistedSquadGroupName,
  persistenceQuery,
} from "./persistence-query.ts";
import { listAvailableCharactersForOwnerWithDatabase } from "./squad-group-directory-store.ts";

const createSquadGroupWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createSquadGroupEffect({
    actorUserId,
    name,
  }: CreateSquadGroupStoreInput) {
    const insert = database
      .insert(squadGroup)
      .values({
        name,
        ownerUserId: actorUserId,
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

const deleteSquadGroupWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* deleteSquadGroupEffect({
    actorUserId,
    groupId,
  }: DeleteSquadGroupStoreInput) {
    const operation = "deleteSquadGroup" as const;
    const groupIdNumber = groupId;
    const existingRows = yield* persistenceQuery(
      operation,
      database
        .select({ ownerUserId: squadGroup.ownerUserId })
        .from(squadGroup)
        .where(eq(squadGroup.id, groupIdNumber))
        .limit(1)
    );
    const [existing] = existingRows;

    if (existing === undefined) {
      return yield* new SquadGroupNotFound({});
    }
    if (existing.ownerUserId !== actorUserId) {
      return yield* new ActorDoesNotOwnSquadGroup({});
    }

    yield* persistenceQuery(
      operation,
      database
        .delete(squadGroup)
        .where(
          and(
            eq(squadGroup.id, groupIdNumber),
            eq(squadGroup.ownerUserId, actorUserId)
          )
        )
    );
    return yield* Effect.void;
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
      .where(eq(squadGroup.ownerUserId, actorUserId))
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

export const loadSquadGroupDetailWithDatabase = (
  database: EffectPgDatabase | TransactionDatabase
) =>
  Effect.fnUntraced(function* loadSquadGroupDetailEffect({
    actorUserId,
    groupId,
  }: GetSquadGroupDetailInput) {
    const operation = "getSquadGroupDetail" as const;
    const groupIdNumber = groupId;
    const actor = actorUserId;
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
      access = SquadGroupAccess.SquadGroupOwnerAccess({
        groupId,
        ownerUserId: actorUserId,
        role: "owner",
      });
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

        access = SquadGroupAccess.SquadGroupViewerAccess({
          groupId,
          ownerUserId,
          role: "viewer",
        });
      } else {
        const invitationId = yield* parseSquadGroupInvitationId(invite.id).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );

        access = SquadGroupAccess.SquadGroupEditorAccess({
          editorUserId: actorUserId,
          groupId,
          invitationId,
          ownerUserId,
          role: "editor",
        });
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

    let charactersBySquadId = HashMap.empty<
      number,
      readonly SquadGroupCharacter[]
    >();

    for (const placement of placementRows) {
      const current = HashMap.get(charactersBySquadId, placement.squadId).pipe(
        Option.getOrElse(() => [])
      );
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

      charactersBySquadId = HashMap.set(
        charactersBySquadId,
        placement.squadId,
        [
          ...current,
          {
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
          },
        ]
      );
    }

    const squads = [];

    for (const row of squadRows) {
      const squadId = yield* parseSquadId(row.id).pipe(
        Effect.catchTag("InvalidSquadId", (error) =>
          failPersistence(operation, error)
        )
      );

      squads.push({
        characters: HashMap.get(charactersBySquadId, row.id).pipe(
          Option.getOrElse(() => [])
        ),
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

const saveSquadGroupSnapshotWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* saveSquadGroupSnapshotEffect({
    actorUserId,
    expectedUpdatedAt,
    now,
    snapshot,
  }: SaveSquadGroupSnapshotStoreInput) {
    const operation = "saveSquadGroupSnapshot" as const;
    const groupIdNumber = snapshot.groupId;

    const transaction = database.transaction(
      Effect.fnUntraced(function* saveSquadGroupSnapshotTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx.execute(sql`set transaction isolation level repeatable read`);
        yield* tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`squad-group:${groupIdNumber}`}))`
        );

        const groupSelect = tx
          .select({
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

        if (group.ownerUserId !== actorUserId) {
          return yield* new ActorDoesNotOwnSquadGroup();
        }

        const ownerUserId = yield* parsePersistedAppUserId(
          operation,
          group.ownerUserId
        );
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
          snapshot,
        });
        const availableByCharacterId = HashMap.fromIterable(
          availableCharacters.map(
            (character) => [character.characterId, character] as const
          )
        );

        yield* tx
          .update(squadGroup)
          .set({
            name: snapshot.name,
            updatedAt: now,
          })
          .where(eq(squadGroup.id, groupIdNumber));

        const existingSquads = yield* tx
          .select({ id: squad.id })
          .from(squad)
          .where(eq(squad.squadGroupId, groupIdNumber));
        const existingSquadIds = new Set(
          existingSquads.map((existingSquad) => existingSquad.id)
        );
        const submittedSquadIds = new Set<number>();

        for (const squadSnapshot of validatedSnapshot.squads) {
          const { squadId } = squadSnapshot;
          if (squadId === undefined) {
            continue;
          }

          if (existingSquadIds.has(squadId)) {
            submittedSquadIds.add(squadId);
            continue;
          }

          return yield* new SquadNotInGroup({ squadId });
        }

        yield* tx
          .delete(squadCharacter)
          .where(eq(squadCharacter.squadGroupId, groupIdNumber));

        for (const existingSquad of existingSquads) {
          if (submittedSquadIds.has(existingSquad.id)) {
            // Clear existing positions first so reordering satisfies the unique index.
            yield* tx
              .update(squad)
              .set({ position: -existingSquad.id })
              .where(eq(squad.id, existingSquad.id));
            continue;
          }

          yield* tx.delete(squad).where(eq(squad.id, existingSquad.id));
        }

        for (const squadSnapshot of validatedSnapshot.squads) {
          const { squadId } = squadSnapshot;
          let persistedSquadId: number;

          switch (squadId) {
            case undefined: {
              const insertedSquadRows = yield* tx
                .insert(squad)
                .values({
                  name: squadSnapshot.name,
                  position: squadSnapshot.position,
                  squadGroupId: groupIdNumber,
                  updatedAt: now,
                })
                .returning({ id: squad.id });

              const [insertedSquad] = insertedSquadRows;

              if (insertedSquad === undefined) {
                return yield* new SquadBuilderPersistenceUnavailable({
                  cause: new Error("Failed to insert squad"),
                  operation,
                  provider: "postgres",
                });
              }

              persistedSquadId = insertedSquad.id;
              break;
            }
            default: {
              const updatedSquadRows = yield* tx
                .update(squad)
                .set({
                  name: squadSnapshot.name,
                  position: squadSnapshot.position,
                  updatedAt: now,
                })
                .where(eq(squad.id, squadId))
                .returning({ id: squad.id });

              const [updatedSquad] = updatedSquadRows;

              if (updatedSquad === undefined) {
                return yield* new SquadBuilderPersistenceUnavailable({
                  cause: new Error("Failed to update squad"),
                  operation,
                  provider: "postgres",
                });
              }

              persistedSquadId = updatedSquad.id;
              break;
            }
          }

          if (squadSnapshot.characters.length === 0) {
            continue;
          }

          const placementRows = [];

          for (const placement of squadSnapshot.characters) {
            const character = HashMap.get(
              availableByCharacterId,
              placement.characterId
            ).pipe(Option.getOrUndefined);

            if (character === undefined) {
              return yield* new SquadBuilderPersistenceUnavailable({
                cause: new Error("Validated character was not available"),
                operation,
                provider: "postgres",
              });
            }

            placementRows.push({
              accountId: character.accountId,
              characterId: placement.characterId,
              position: placement.position,
              squadGroupId: groupIdNumber,
              squadId: persistedSquadId,
            });
          }

          yield* tx.insert(squadCharacter).values(placementRows);
        }

        return yield* loadSquadGroupDetailWithDatabase(tx)({
          actorUserId,
          groupId: snapshot.groupId,
        });
      })
    );

    return yield* persistenceQuery(operation, transaction).pipe(
      Effect.catchTag(
        "ActorCannotViewSquadGroup",
        () => new ActorDoesNotOwnSquadGroup()
      )
    );
  });

const setSquadGroupVisibilityWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* setSquadGroupVisibilityEffect({
    actorUserId,
    groupId,
    now,
    visibility,
  }: SetSquadGroupVisibilityStoreInput) {
    const operation = "setSquadGroupVisibility" as const;
    const groupIdNumber = groupId;
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

    if (existing.ownerUserId !== actorUserId) {
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

/** Provide the squad-group aggregate store with its Drizzle implementation. */
const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const DrizzleSquadGroupAggregateStoreServiceLayer: Layer.Layer<
  SquadGroupAggregateStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  SquadGroupAggregateStoreService,
  getDatabaseSync((database) =>
    SquadGroupAggregateStoreService.of({
      createSquadGroup: Effect.fn("SquadGroupAggregateStore.createSquadGroup")(
        createSquadGroupWithDatabase(database)
      ),
      deleteSquadGroup: Effect.fn("SquadGroupAggregateStore.deleteSquadGroup")(
        deleteSquadGroupWithDatabase(database)
      ),
      getSquadGroupDetail: Effect.fn(
        "SquadGroupAggregateStore.getSquadGroupDetail"
      )(function* getSquadGroupDetailWithSnapshot(input) {
        const transaction = database.transaction(
          Effect.fnUntraced(function* getSquadGroupDetailTransaction(
            tx: TransactionDatabase
          ) {
            yield* tx.execute(
              sql`set transaction isolation level repeatable read`
            );
            return yield* loadSquadGroupDetailWithDatabase(tx)(input);
          })
        );

        return yield* persistenceQuery("getSquadGroupDetail", transaction);
      }),
      listMySquadGroups: Effect.fn(
        "SquadGroupAggregateStore.listMySquadGroups"
      )(listMySquadGroupsWithDatabase(database)),
      saveSquadGroupSnapshot: Effect.fn(
        "SquadGroupAggregateStore.saveSquadGroupSnapshot"
      )(saveSquadGroupSnapshotWithDatabase(database)),
      setSquadGroupVisibility: Effect.fn(
        "SquadGroupAggregateStore.setSquadGroupVisibility"
      )(setSquadGroupVisibilityWithDatabase(database)),
    })
  )
);
