import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemCharacter,
  squadCharacter,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, asc, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Order from "effect/Order";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../../../domain/squad-builder/margonem-character.ts";
import {
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
} from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import { parsePendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import {
  AccountImportStoreService,
  ProfileAccessState,
} from "../../../services/squad-builder/account-import/account-import-store.ts";
import type {
  ConfirmPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  DeleteOwnedAccountInput,
  FindProfileAccessStateInput,
  ListOwnedMargonemAccountsInput,
  OwnedMargonemAccountSummary,
  UpdateOwnedAccountDisplayNameInput,
} from "../../../services/squad-builder/account-import/account-import-store.ts";
import {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountNotFound,
  MargonemAccountOwnedByAnotherUser,
  PendingMargonemAccountImportNotFound,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import { failPersistence, persistenceQuery } from "./persistence-query.ts";

const ACCOUNT_CHARACTER_PREVIEW_LIMIT = 1;

const findProfileAccessStateWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* findProfileAccessStateEffect({
    actorUserId,
    profileId,
  }: FindProfileAccessStateInput) {
    const operation = "findProfileAccessState" as const;
    const accountSelect = database
      .select({
        id: margonemAccount.id,
        ownerUserId: margonemAccount.ownerUserId,
      })
      .from(margonemAccount)
      .where(eq(margonemAccount.profileId, profileId))
      .limit(1);
    const accountRows = yield* persistenceQuery(operation, accountSelect);

    const [account] = accountRows;

    if (account === undefined) {
      return ProfileAccessState.Available();
    }

    if (account.ownerUserId === actorUserId) {
      return ProfileAccessState.OwnedByActor();
    }

    const accessSelect = database
      .select({ id: margonemAccountAccess.id })
      .from(margonemAccountAccess)
      .where(
        and(
          eq(margonemAccountAccess.accountId, account.id),
          eq(margonemAccountAccess.userId, actorUserId),
          eq(margonemAccountAccess.status, "accepted")
        )
      )
      .limit(1);
    const accessRows = yield* persistenceQuery(operation, accessSelect);

    if (accessRows[0] !== undefined) {
      return ProfileAccessState.SharedWithActor();
    }

    return ProfileAccessState.OwnedByAnotherUser();
  });

const createPendingImportWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createPendingImportEffect({
    actorUserId,
    expiresAt,
    fetchedAt,
    jarunaCharacters,
    profileId,
  }: CreatePendingMargonemAccountImportInput) {
    const operation = "createPendingImport" as const;
    const transaction = database.transaction(
      Effect.fnUntraced(function* createPendingImportTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx
          .delete(margonemAccountImportPreview)
          .where(lte(margonemAccountImportPreview.expiresAt, sql`now()`));

        const insert = tx
          .insert(margonemAccountImportPreview)
          .values({
            actorUserId,
            expiresAt,
            fetchedAt,
            profileId,
          })
          .returning({ id: margonemAccountImportPreview.id });
        const insertedRows = yield* insert;

        const [preview] = insertedRows;

        if (preview === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to create pending import preview")
          );
        }

        if (jarunaCharacters.length > 0) {
          const characterInsert = tx
            .insert(margonemAccountImportPreviewCharacter)
            .values(
              jarunaCharacters.map((character) => ({
                avatarUrl: character.avatarUrl,
                characterId: character.characterId,
                importPreviewId: preview.id,
                level: character.level,
                name: character.name,
                profession: character.profession,
                world: character.world,
              }))
            );
          yield* characterInsert;
        }

        const pendingImportId = yield* parsePendingMargonemAccountImportId(
          preview.id
        ).pipe(Effect.catch((error) => failPersistence(operation, error)));

        return {
          id: pendingImportId,
          profileId,
        };
      })
    );

    return yield* persistenceQuery(operation, transaction);
  });

const confirmPendingImportWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* confirmPendingImportEffect({
    actorUserId,
    displayName,
    now,
    pendingImportId,
  }: ConfirmPendingImportInput) {
    const operation = "confirmPendingImport" as const;
    const transaction = database.transaction(
      Effect.fnUntraced(function* confirmPendingImportTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx
          .delete(margonemAccountImportPreview)
          .where(lte(margonemAccountImportPreview.expiresAt, sql`now()`));

        const previewSelect = tx
          .select({
            fetchedAt: margonemAccountImportPreview.fetchedAt,
            id: margonemAccountImportPreview.id,
            profileId: margonemAccountImportPreview.profileId,
          })
          .from(margonemAccountImportPreview)
          .where(
            and(
              eq(margonemAccountImportPreview.id, pendingImportId),
              eq(margonemAccountImportPreview.actorUserId, actorUserId),
              gt(margonemAccountImportPreview.expiresAt, now)
            )
          )
          .limit(1)
          .for("update");
        const previewRows = yield* previewSelect;
        const [preview] = previewRows;

        if (preview === undefined) {
          return yield* new PendingMargonemAccountImportNotFound();
        }

        const characterRows = yield* tx
          .select({
            avatarUrl: margonemAccountImportPreviewCharacter.avatarUrl,
            characterId: margonemAccountImportPreviewCharacter.characterId,
            level: margonemAccountImportPreviewCharacter.level,
            name: margonemAccountImportPreviewCharacter.name,
            profession: margonemAccountImportPreviewCharacter.profession,
            world: margonemAccountImportPreviewCharacter.world,
          })
          .from(margonemAccountImportPreviewCharacter)
          .where(
            eq(
              margonemAccountImportPreviewCharacter.importPreviewId,
              preview.id
            )
          );
        const jarunaCharacters = [];

        for (const row of characterRows) {
          const characterId = yield* parseMargonemCharacterId(
            row.characterId
          ).pipe(Effect.catch((error) => failPersistence(operation, error)));
          const level = yield* parsePositiveLevel(row.level).pipe(
            Effect.catch((error) => failPersistence(operation, error))
          );
          const profession = yield* parseMargonemProfession(
            row.profession
          ).pipe(Effect.catch((error) => failPersistence(operation, error)));
          const world = yield* parseMargonemWorld(row.world).pipe(
            Effect.catch((error) => failPersistence(operation, error))
          );

          jarunaCharacters.push({
            avatarUrl: row.avatarUrl,
            characterId,
            level,
            name: row.name,
            profession,
            world,
          });
        }

        const profileId = yield* parseMargonemProfileId(preview.profileId).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );
        const pending = {
          fetchedAt: preview.fetchedAt,
          id: pendingImportId,
          jarunaCharacters,
          profileId,
        };

        const existingSelect = tx
          .select({ ownerUserId: margonemAccount.ownerUserId })
          .from(margonemAccount)
          .where(eq(margonemAccount.profileId, pending.profileId))
          .limit(1);
        const existingRows = yield* existingSelect;

        const [existing] = existingRows;

        if (existing !== undefined) {
          return yield* existing.ownerUserId === actorUserId
            ? new MargonemAccountAlreadyOwnedByActor()
            : new MargonemAccountOwnedByAnotherUser();
        }

        const insert = tx
          .insert(margonemAccount)
          .values({
            displayName,
            lastFetchedAt: pending.fetchedAt,
            ownerUserId: actorUserId,
            profileId: pending.profileId,
          })
          .returning({
            createdAt: margonemAccount.createdAt,
            id: margonemAccount.id,
          });
        const accountRows = yield* insert;

        const [account] = accountRows;

        if (account === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to insert owned account")
          );
        }

        if (pending.jarunaCharacters.length > 0) {
          const characterInsert = tx.insert(margonemCharacter).values(
            pending.jarunaCharacters.map((character) => ({
              accountId: account.id,
              avatarUrl: character.avatarUrl,
              characterId: character.characterId,
              level: character.level,
              name: character.name,
              profession: character.profession,
              world: character.world,
            }))
          );
          yield* characterInsert;
        }

        const deletedRows = yield* tx
          .delete(margonemAccountImportPreview)
          .where(
            and(
              eq(margonemAccountImportPreview.id, pending.id),
              eq(margonemAccountImportPreview.actorUserId, actorUserId)
            )
          )
          .returning({ id: margonemAccountImportPreview.id });

        if (deletedRows[0] === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to delete consumed account import preview")
          );
        }

        const accountId = yield* parseMargonemAccountId(account.id).pipe(
          Effect.catch((error) => failPersistence(operation, error))
        );

        return {
          accountId,
          characterCount: pending.jarunaCharacters.length,
          characterPreviews: Arr.map(
            Arr.take(
              Arr.sortWith(
                pending.jarunaCharacters,
                (character) => character.level,
                Order.flip(Order.Number)
              ),
              ACCOUNT_CHARACTER_PREVIEW_LIMIT
            ),
            (character) => ({
              avatarUrl: character.avatarUrl,
              characterId: character.characterId,
              name: character.name,
              profession: character.profession,
            })
          ),
          displayName,
          generatedProfileUrl: toMargonemProfileUrl(pending.profileId),
          lastFetchedAt: pending.fetchedAt,
          profileId: pending.profileId,
        };
      })
    );

    return yield* persistenceQuery(operation, transaction);
  });

const loadOwnedAccountWithDatabase = (
  database: EffectPgDatabase | TransactionDatabase
) =>
  Effect.fnUntraced(function* loadOwnedAccountEffect({
    accountId,
    actorUserId,
  }: {
    readonly accountId: number;
    readonly actorUserId: string;
  }) {
    const operation = "updateOwnedAccountDisplayName" as const;
    const accountSelect = database
      .select({
        accountId: margonemAccount.id,
        characterCount: sql<number>`count(${margonemCharacter.id})::int`,
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
      .where(
        and(
          eq(margonemAccount.id, accountId),
          eq(margonemAccount.ownerUserId, actorUserId)
        )
      )
      .groupBy(margonemAccount.id)
      .limit(1);
    const accountRows = yield* persistenceQuery(operation, accountSelect);
    const [account] = accountRows;

    if (account === undefined) {
      return yield* failPersistence(
        operation,
        new Error("Updated owned account was not found")
      );
    }

    const characterRows = yield* persistenceQuery(
      operation,
      database
        .select({
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.characterId,
          id: margonemCharacter.id,
          level: margonemCharacter.level,
          name: margonemCharacter.name,
          profession: margonemCharacter.profession,
        })
        .from(margonemCharacter)
        .where(eq(margonemCharacter.accountId, accountId))
        .orderBy(desc(margonemCharacter.level), asc(margonemCharacter.id))
        .limit(ACCOUNT_CHARACTER_PREVIEW_LIMIT)
    );

    const accountIdValue = yield* parseMargonemAccountId(
      account.accountId
    ).pipe(Effect.catch((error) => failPersistence(operation, error)));
    const displayName = yield* parseAccountDisplayName(
      account.displayName
    ).pipe(Effect.catch((error) => failPersistence(operation, error)));
    const profileId = yield* parseMargonemProfileId(account.profileId).pipe(
      Effect.catch((error) => failPersistence(operation, error))
    );

    return {
      accountId: accountIdValue,
      characterCount: account.characterCount ?? 0,
      characterPreviews: characterRows.map((character) => ({
        avatarUrl: character.avatarUrl,
        characterId: character.characterId,
        name: character.name,
        profession: character.profession,
      })),
      displayName,
      generatedProfileUrl: toMargonemProfileUrl(profileId),
      lastFetchedAt: account.lastFetchedAt ?? account.createdAt,
      profileId,
    };
  });

const updateOwnedAccountDisplayNameWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* updateOwnedAccountDisplayNameEffect({
    accountId,
    actorUserId,
    displayName,
    now,
  }: UpdateOwnedAccountDisplayNameInput) {
    const operation = "updateOwnedAccountDisplayName" as const;
    const accountIdNumber = accountId;
    const transaction = database.transaction(
      Effect.fnUntraced(function* updateOwnedAccountDisplayNameTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx.execute(sql`set transaction isolation level repeatable read`);

        const accountSelect = tx
          .select({ ownerUserId: margonemAccount.ownerUserId })
          .from(margonemAccount)
          .where(eq(margonemAccount.id, accountIdNumber))
          .limit(1)
          .for("update");
        const accountRows = yield* accountSelect;
        const [account] = accountRows;

        if (account === undefined) {
          return yield* new MargonemAccountNotFound();
        }

        if (account.ownerUserId !== actorUserId) {
          return yield* new ActorDoesNotOwnMargonemAccount();
        }

        yield* tx
          .update(margonemAccount)
          .set({
            displayName,
            updatedAt: now,
          })
          .where(eq(margonemAccount.id, accountIdNumber));

        return yield* loadOwnedAccountWithDatabase(tx)({
          accountId: accountIdNumber,
          actorUserId,
        });
      })
    );

    return yield* persistenceQuery(operation, transaction);
  });

const deleteOwnedAccountWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* deleteOwnedAccountEffect({
    accountId,
    actorUserId,
  }: DeleteOwnedAccountInput) {
    const operation = "deleteOwnedAccount" as const;
    const accountIdNumber = accountId;
    const transaction = database.transaction(
      Effect.fnUntraced(function* deleteOwnedAccountTransaction(
        tx: TransactionDatabase
      ) {
        const accountSelect = tx
          .select({ ownerUserId: margonemAccount.ownerUserId })
          .from(margonemAccount)
          .where(eq(margonemAccount.id, accountIdNumber))
          .limit(1);
        const accountRows = yield* accountSelect;
        const [account] = accountRows;

        if (account === undefined) {
          return yield* new MargonemAccountNotFound();
        }

        if (account.ownerUserId !== actorUserId) {
          return yield* new ActorDoesNotOwnMargonemAccount();
        }

        const characterRows = yield* tx
          .select({
            count: sql<number>`count(${margonemCharacter.id})::int`,
          })
          .from(margonemCharacter)
          .where(eq(margonemCharacter.accountId, accountIdNumber));
        const squadCharacterRows = yield* tx
          .select({
            count: sql<number>`count(${squadCharacter.id})::int`,
          })
          .from(squadCharacter)
          .where(eq(squadCharacter.accountId, accountIdNumber));
        const accessRows = yield* tx
          .select({
            count: sql<number>`count(${margonemAccountAccess.id})::int`,
          })
          .from(margonemAccountAccess)
          .where(eq(margonemAccountAccess.accountId, accountIdNumber));

        const deletedRows = yield* tx
          .delete(margonemAccount)
          .where(eq(margonemAccount.id, accountIdNumber))
          .returning({ id: margonemAccount.id });

        if (deletedRows[0] === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to delete owned account")
          );
        }

        return {
          accountId,
          removedAccessGrantCount: accessRows[0]?.count ?? 0,
          removedCharacterCount: characterRows[0]?.count ?? 0,
          removedSquadCharacterCount: squadCharacterRows[0]?.count ?? 0,
        };
      })
    );

    return yield* persistenceQuery(operation, transaction);
  });

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
      .where(eq(margonemAccount.ownerUserId, actorUserId))
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
    const characterRowsByAccount = Arr.groupBy(characterRows, (row) =>
      String(row.accountId)
    );

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
        characterPreviews:
          characterRowsByAccount[String(row.accountId)]
            ?.slice(0, ACCOUNT_CHARACTER_PREVIEW_LIMIT)
            .map((character) => ({
              avatarUrl: character.avatarUrl,
              characterId: character.characterId,
              name: character.name,
              profession: character.profession,
            })) ?? [],
        displayName,
        generatedProfileUrl: toMargonemProfileUrl(profileId),
        lastFetchedAt: row.lastFetchedAt ?? row.createdAt,
        profileId,
      });
    }

    return accounts;
  });

export const DrizzleAccountImportStoreServiceLayer: Layer.Layer<
  AccountImportStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  AccountImportStoreService,
  EffectDatabase.useSync((database) =>
    AccountImportStoreService.of({
      confirmPendingImport: Effect.fn(
        "AccountImportStore.confirmPendingImport"
      )(confirmPendingImportWithDatabase(database)),
      createPendingImport: Effect.fn("AccountImportStore.createPendingImport")(
        createPendingImportWithDatabase(database)
      ),
      deleteOwnedAccount: Effect.fn("AccountImportStore.deleteOwnedAccount")(
        deleteOwnedAccountWithDatabase(database)
      ),
      findProfileAccessState: Effect.fn(
        "AccountImportStore.findProfileAccessState"
      )(findProfileAccessStateWithDatabase(database)),
      listOwnedAccounts: Effect.fn("AccountImportStore.listOwnedAccounts")(
        listOwnedAccountsWithDatabase(database)
      ),
      updateOwnedAccountDisplayName: Effect.fn(
        "AccountImportStore.updateOwnedAccountDisplayName"
      )(updateOwnedAccountDisplayNameWithDatabase(database)),
    })
  )
);
