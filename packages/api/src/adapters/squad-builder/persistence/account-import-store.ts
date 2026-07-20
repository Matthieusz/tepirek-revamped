import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemCharacter,
  squadCharacter,
} from "@tepirek-revamped/db/schema/squad-builder";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "../../../domain/squad-builder/account-display-name.ts";
import { appUserIdToString } from "../../../domain/squad-builder/app-user-id.ts";
import { firecrawlYearMonthToString } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../../../domain/squad-builder/margonem-account-id.ts";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../../../domain/squad-builder/margonem-character.ts";
import {
  characterIdToNumber,
  levelToNumber,
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
  profileIdToNumber,
} from "../../../domain/squad-builder/margonem-profile-id.ts";
import { toMargonemProfileUrl } from "../../../domain/squad-builder/margonem-profile-url.ts";
import {
  parsePendingMargonemAccountImportId,
  pendingImportIdToNumber,
} from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { AccountImportStoreService } from "../../../services/squad-builder/account-import/account-import-store-service.ts";
import type {
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  DeleteOwnedAccountInput,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  ListOwnedMargonemAccountsInput,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  OwnedMargonemAccountSummary,
  ReserveFirecrawlRequestInput,
  UpdateOwnedAccountDisplayNameInput,
} from "../../../services/squad-builder/account-import/account-import-store.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import {
  ActorDoesNotOwnMargonemAccount,
  FirecrawlMonthlyBudgetExhausted,
  MargonemAccountAlreadyOwnedByActor,
  MargonemAccountNotFound,
  MargonemAccountOwnedByAnotherUser,
  PendingMargonemAccountImportNotFound,
} from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import {
  failPersistence,
  namedStoreMethod,
  persistenceQuery,
  usedFirecrawlRequestStatuses,
} from "./persistence-query.ts";

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
      .where(eq(margonemAccount.profileId, profileIdToNumber(profileId)))
      .limit(1);
    const accountRows = yield* persistenceQuery(operation, accountSelect);

    const [account] = accountRows;

    if (account === undefined) {
      return { _tag: "Available" as const };
    }

    if (account.ownerUserId === appUserIdToString(actorUserId)) {
      return { _tag: "OwnedByActor" as const };
    }

    const accessSelect = database
      .select({ id: margonemAccountAccess.id })
      .from(margonemAccountAccess)
      .where(
        and(
          eq(margonemAccountAccess.accountId, account.id),
          eq(margonemAccountAccess.userId, appUserIdToString(actorUserId)),
          eq(margonemAccountAccess.status, "accepted")
        )
      )
      .limit(1);
    const accessRows = yield* persistenceQuery(operation, accessSelect);

    if (accessRows[0] !== undefined) {
      return { _tag: "SharedWithActor" as const };
    }

    return { _tag: "OwnedByAnotherUser" as const };
  });

const reserveRequestWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* reserveRequestEffect({
    monthlyRequestBudget,
    profileId,
    requestedByUserId,
    yearMonth,
  }: ReserveFirecrawlRequestInput) {
    const operation = "reserveRequest" as const;
    const yearMonthText = firecrawlYearMonthToString(yearMonth);
    const transaction = database.transaction(
      Effect.fnUntraced(function* reserveInTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${`firecrawl:${yearMonthText}`}))`
        );
        const usageSelect = tx
          .select({ usedRequests: count() })
          .from(firecrawlProfileScrapeRequest)
          .where(
            and(
              eq(firecrawlProfileScrapeRequest.yearMonth, yearMonthText),
              inArray(
                firecrawlProfileScrapeRequest.status,
                usedFirecrawlRequestStatuses
              )
            )
          );
        const usageRows = yield* usageSelect;

        const usedRequests = usageRows[0]?.usedRequests ?? 0;

        if (usedRequests >= monthlyRequestBudget) {
          return yield* new FirecrawlMonthlyBudgetExhausted({
            monthlyRequestBudget,
            usedRequests,
            yearMonth,
          });
        }

        const insert = tx
          .insert(firecrawlProfileScrapeRequest)
          .values({
            profileId: profileIdToNumber(profileId),
            requestedByUserId: appUserIdToString(requestedByUserId),
            status: "reserved",
            yearMonth: yearMonthText,
          })
          .returning({ id: firecrawlProfileScrapeRequest.id });
        const insertedRows = yield* insert;

        const [reserved] = insertedRows;

        if (reserved === undefined) {
          return yield* failPersistence(
            operation,
            new Error("Failed to reserve Firecrawl request")
          );
        }

        const nextUsedRequests = usedRequests + 1;

        return {
          budgetState: {
            monthlyRequestBudget,
            remainingRequests: monthlyRequestBudget - nextUsedRequests,
            usedRequests: nextUsedRequests,
            yearMonth,
          },
          requestId: reserved.id,
        };
      })
    );

    return yield* persistenceQuery(operation, transaction);
  });

const markRequestSucceededWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    cacheState,
    completedAt,
    creditsUsed,
    firecrawlStatusCode,
    requestId,
  }: MarkFirecrawlRequestSucceededInput): Effect.Effect<
    void,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > => {
    const operation = "markRequestSucceeded" as const;
    const update = database
      .update(firecrawlProfileScrapeRequest)
      .set({
        cacheState,
        completedAt,
        creditsUsed,
        firecrawlStatusCode,
        status: "succeeded",
      })
      .where(eq(firecrawlProfileScrapeRequest.id, requestId));

    return persistenceQuery(operation, update).pipe(Effect.asVoid);
  };

const markRequestFailedWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    completedAt,
    errorTag,
    requestId,
  }: MarkFirecrawlRequestFailedInput): Effect.Effect<
    void,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > => {
    const operation = "markRequestFailed" as const;
    const update = database
      .update(firecrawlProfileScrapeRequest)
      .set({ completedAt, errorTag, status: "failed" })
      .where(eq(firecrawlProfileScrapeRequest.id, requestId));

    return persistenceQuery(operation, update).pipe(Effect.asVoid);
  };

const createPendingImportWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createPendingImportEffect({
    actorUserId,
    defaultDisplayName,
    expiresAt,
    fetchedAt,
    firecrawlCreditsUsed,
    jarunaCharacters,
    profileId,
    suggestedAccountName,
  }: CreatePendingMargonemAccountImportInput) {
    const operation = "createPendingImport" as const;
    const transaction = database.transaction(
      Effect.fnUntraced(function* createPendingImportTransaction(
        tx: TransactionDatabase
      ) {
        const insert = tx
          .insert(margonemAccountImportPreview)
          .values({
            actorUserId: appUserIdToString(actorUserId),
            defaultDisplayName: accountDisplayNameToString(defaultDisplayName),
            expiresAt,
            fetchedAt,
            firecrawlCreditsUsed,
            profileId: profileIdToNumber(profileId),
            suggestedAccountName,
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
                characterId: characterIdToNumber(character.characterId),
                importPreviewId: preview.id,
                level: levelToNumber(character.level),
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

const findPendingImportForConfirmationWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* findPendingImportForConfirmationEffect({
    actorUserId,
    now,
    pendingImportId,
  }: FindPendingMargonemAccountImportInput) {
    const operation = "findPendingImportForConfirmation" as const;
    const previewSelect = database
      .select({
        fetchedAt: margonemAccountImportPreview.fetchedAt,
        id: margonemAccountImportPreview.id,
        profileId: margonemAccountImportPreview.profileId,
      })
      .from(margonemAccountImportPreview)
      .where(
        and(
          eq(
            margonemAccountImportPreview.id,
            pendingImportIdToNumber(pendingImportId)
          ),
          eq(
            margonemAccountImportPreview.actorUserId,
            appUserIdToString(actorUserId)
          ),
          isNull(margonemAccountImportPreview.confirmedAt),
          gt(margonemAccountImportPreview.expiresAt, now)
        )
      )
      .limit(1);
    const previewRows = yield* persistenceQuery(operation, previewSelect);

    const [preview] = previewRows;

    if (preview === undefined) {
      return yield* new PendingMargonemAccountImportNotFound();
    }

    const characterSelect = database
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
        eq(margonemAccountImportPreviewCharacter.importPreviewId, preview.id)
      );
    const characterRows = yield* persistenceQuery(operation, characterSelect);

    const jarunaCharacters = [];

    for (const row of characterRows) {
      const characterId = yield* parseMargonemCharacterId(row.characterId).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const level = yield* parsePositiveLevel(row.level).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

      const profession = yield* parseMargonemProfession(row.profession).pipe(
        Effect.catch((error) => failPersistence(operation, error))
      );

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

    return {
      actorUserId,
      fetchedAt: preview.fetchedAt,
      id: pendingImportId,
      jarunaCharacters,
      profileId,
    };
  });

const createOwnedAccountFromPendingImportWithDatabase = (
  database: EffectPgDatabase
) =>
  Effect.fnUntraced(function* createOwnedAccountFromPendingImportEffect({
    actorUserId,
    confirmedAt,
    displayName,
    pending,
  }: CreateOwnedAccountFromPendingImportInput) {
    const operation = "createOwnedAccountFromPendingImport" as const;
    const transaction = database.transaction(
      Effect.fnUntraced(
        function* createOwnedAccountFromPendingImportTransaction(
          tx: TransactionDatabase
        ) {
          const existingSelect = tx
            .select({ ownerUserId: margonemAccount.ownerUserId })
            .from(margonemAccount)
            .where(
              eq(
                margonemAccount.profileId,
                profileIdToNumber(pending.profileId)
              )
            )
            .limit(1);
          const existingRows = yield* existingSelect;

          const [existing] = existingRows;

          if (existing !== undefined) {
            return yield* existing.ownerUserId ===
            appUserIdToString(actorUserId)
              ? new MargonemAccountAlreadyOwnedByActor()
              : new MargonemAccountOwnedByAnotherUser();
          }

          const insert = tx
            .insert(margonemAccount)
            .values({
              displayName: accountDisplayNameToString(displayName),
              lastFetchedAt: pending.fetchedAt,
              ownerUserId: appUserIdToString(actorUserId),
              profileId: profileIdToNumber(pending.profileId),
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
                characterId: characterIdToNumber(character.characterId),
                level: levelToNumber(character.level),
                name: character.name,
                profession: character.profession,
                world: character.world,
              }))
            );
            yield* characterInsert;
          }

          const update = tx
            .update(margonemAccountImportPreview)
            .set({ confirmedAt })
            .where(
              eq(
                margonemAccountImportPreview.id,
                pendingImportIdToNumber(pending.id)
              )
            );
          yield* update;

          const accountId = yield* parseMargonemAccountId(account.id).pipe(
            Effect.catch((error) => failPersistence(operation, error))
          );

          return {
            accountId,
            characterCount: pending.jarunaCharacters.length,
            characterPreviews: pending.jarunaCharacters
              .toSorted((left, right) => right.level - left.level)
              .slice(0, ACCOUNT_CHARACTER_PREVIEW_LIMIT)
              .map((character) => ({
                avatarUrl: character.avatarUrl,
                characterId: character.characterId,
                name: character.name,
                profession: character.profession,
              })),
            displayName,
            generatedProfileUrl: toMargonemProfileUrl(pending.profileId),
            lastFetchedAt: pending.fetchedAt,
            profileId: pending.profileId,
          };
        }
      )
    );

    return yield* persistenceQuery(operation, transaction);
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
    const accountIdNumber = margonemAccountIdToNumber(accountId);
    const accountSelect = database
      .select({ ownerUserId: margonemAccount.ownerUserId })
      .from(margonemAccount)
      .where(eq(margonemAccount.id, accountIdNumber))
      .limit(1);
    const accountRows = yield* persistenceQuery(operation, accountSelect);
    const [account] = accountRows;

    if (account === undefined) {
      return yield* new MargonemAccountNotFound();
    }

    if (account.ownerUserId !== appUserIdToString(actorUserId)) {
      return yield* new ActorDoesNotOwnMargonemAccount();
    }

    yield* persistenceQuery(
      operation,
      database
        .update(margonemAccount)
        .set({
          displayName: accountDisplayNameToString(displayName),
          updatedAt: now,
        })
        .where(eq(margonemAccount.id, accountIdNumber))
    );

    // oxlint-disable-next-line no-use-before-define -- The list projection is reused after the transactional update.
    const accounts = yield* listOwnedAccountsWithDatabase(database)({
      actorUserId,
    });
    const updatedAccount = accounts.find(
      (candidate) => candidate.accountId === accountId
    );

    if (updatedAccount === undefined) {
      return yield* failPersistence(
        operation,
        new Error("Updated owned account was not found")
      );
    }

    return updatedAccount;
  });

const deleteOwnedAccountWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* deleteOwnedAccountEffect({
    accountId,
    actorUserId,
  }: DeleteOwnedAccountInput) {
    const operation = "deleteOwnedAccount" as const;
    const accountIdNumber = margonemAccountIdToNumber(accountId);
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

        if (account.ownerUserId !== appUserIdToString(actorUserId)) {
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
      createOwnedAccountFromPendingImport: namedStoreMethod(
        "AccountImportStore.createOwnedAccountFromPendingImport",
        createOwnedAccountFromPendingImportWithDatabase(database)
      ),
      createPendingImport: namedStoreMethod(
        "AccountImportStore.createPendingImport",
        createPendingImportWithDatabase(database)
      ),
      deleteOwnedAccount: namedStoreMethod(
        "AccountImportStore.deleteOwnedAccount",
        deleteOwnedAccountWithDatabase(database)
      ),
      findPendingImportForConfirmation: namedStoreMethod(
        "AccountImportStore.findPendingImportForConfirmation",
        findPendingImportForConfirmationWithDatabase(database)
      ),
      findProfileAccessState: namedStoreMethod(
        "AccountImportStore.findProfileAccessState",
        findProfileAccessStateWithDatabase(database)
      ),
      listOwnedAccounts: namedStoreMethod(
        "AccountImportStore.listOwnedAccounts",
        listOwnedAccountsWithDatabase(database)
      ),
      markRequestFailed: namedStoreMethod(
        "AccountImportStore.markRequestFailed",
        markRequestFailedWithDatabase(database)
      ),
      markRequestSucceeded: namedStoreMethod(
        "AccountImportStore.markRequestSucceeded",
        markRequestSucceededWithDatabase(database)
      ),
      reserveRequest: namedStoreMethod(
        "AccountImportStore.reserveRequest",
        reserveRequestWithDatabase(database)
      ),
      updateOwnedAccountDisplayName: namedStoreMethod(
        "AccountImportStore.updateOwnedAccountDisplayName",
        updateOwnedAccountDisplayNameWithDatabase(database)
      ),
    })
  )
);
