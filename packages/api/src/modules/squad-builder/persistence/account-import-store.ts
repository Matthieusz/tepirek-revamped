import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemCharacter,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  accountDisplayNameToString,
  parseAccountDisplayName,
} from "../account-display-name.js";
import { EffectAccountImportStore } from "../account-import/effect-account-import-store.js";
import { appUserIdToString } from "../app-user-id.js";
import { firecrawlYearMonthToString } from "../firecrawl-year-month.js";
import {
  parseMargonemProfession,
  parseMargonemWorld,
} from "../margonem-character.js";
import {
  characterIdToNumber,
  levelToNumber,
  parseMargonemCharacterId,
  parseMargonemProfileId,
  parsePositiveLevel,
  profileIdToNumber,
} from "../margonem-profile-id.js";
import { toMargonemProfileUrl } from "../margonem-profile-url.js";
import { pendingImportIdToNumber } from "../pending-margonem-account-import-id.js";
import { isError } from "../result.js";
import type {
  EffectSquadBuilderPersistenceUnavailable} from "../squad-groups/squad-group-errors.js";
import {
  PendingMargonemAccountImportNotFound,
} from "../squad-groups/squad-group-errors.js";
import type {
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  DuplicateMargonemAccountError,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  ListOwnedMargonemAccountsInput,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  ProfileAccessState,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
} from "../squad-groups/squad-group-store.js";
import {
  failPersistence,
  namedStoreMethod,
  persistenceQuery,
  persistenceQueryUnsafe,
  usedFirecrawlRequestStatuses,
} from "./persistence-query.js";

const findProfileAccessStateWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    profileId,
  }: FindProfileAccessStateInput): Effect.Effect<
    ProfileAccessState,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findProfileAccessStateEffect() {
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

const reserveRequestWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    monthlyRequestBudget,
    profileId,
    requestedByUserId,
    yearMonth,
  }: ReserveFirecrawlRequestInput): Effect.Effect<
    ReservedFirecrawlRequest,
    | {
        readonly _tag: "FirecrawlMonthlyBudgetExhausted";
        readonly yearMonth: typeof yearMonth;
        readonly monthlyRequestBudget: number;
        readonly usedRequests: number;
      }
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* reserveRequestEffect() {
      const operation = "reserveRequest" as const;
      const yearMonthText = firecrawlYearMonthToString(yearMonth);
      const transaction = database.transaction((tx) => {
        const transactionEffect = Effect.gen(function* reserveInTransaction() {
          yield* persistenceQueryUnsafe(
            tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`firecrawl:${yearMonthText}`}))`
            )
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
          const usageRows = yield* persistenceQueryUnsafe(usageSelect);

          const usedRequests = usageRows[0]?.usedRequests ?? 0;

          if (usedRequests >= monthlyRequestBudget) {
            return yield* Effect.fail({
              _tag: "FirecrawlMonthlyBudgetExhausted" as const,
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
          const insertedRows = yield* persistenceQueryUnsafe(insert);

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
        });

        return transactionEffect;
      });

      return yield* persistenceQuery(operation, transaction);
    });

const markRequestSucceededWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    cacheState,
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
        completedAt: new Date(),
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
      .set({ completedAt: new Date(), errorTag, status: "failed" })
      .where(eq(firecrawlProfileScrapeRequest.id, requestId));

    return persistenceQuery(operation, update).pipe(Effect.asVoid);
  };

const createPendingImportWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    defaultDisplayName,
    expiresAt,
    fetchedAt,
    firecrawlCreditsUsed,
    jarunaCharacters,
    profileId,
    suggestedAccountName,
  }: CreatePendingMargonemAccountImportInput): Effect.Effect<
    PendingMargonemAccountImport,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createPendingImportEffect() {
      const operation = "createPendingImport" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* createPendingImportTransaction() {
          const insert = tx
            .insert(margonemAccountImportPreview)
            .values({
              actorUserId: appUserIdToString(actorUserId),
              defaultDisplayName:
                accountDisplayNameToString(defaultDisplayName),
              expiresAt,
              fetchedAt,
              firecrawlCreditsUsed,
              profileId: profileIdToNumber(profileId),
              suggestedAccountName,
            })
            .returning({ id: margonemAccountImportPreview.id });
          const insertedRows = yield* persistenceQueryUnsafe(insert);

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
            yield* persistenceQueryUnsafe(characterInsert);
          }

          return {
            id: preview.id as PendingMargonemAccountImport["id"],
            profileId,
          };
        })
      );

      return yield* persistenceQuery(operation, transaction);
    });

const findPendingImportForConfirmationWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    now,
    pendingImportId,
  }: FindPendingMargonemAccountImportInput): Effect.Effect<
    PendingMargonemAccountImportForConfirmation,
    | PendingMargonemAccountImportNotFound
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findPendingImportForConfirmationEffect() {
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
        const characterId = parseMargonemCharacterId(row.characterId);

        if (isError(characterId)) {
          return yield* failPersistence(operation, characterId.error);
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

        jarunaCharacters.push({
          avatarUrl: row.avatarUrl,
          characterId: characterId.value,
          level: level.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      const profileId = parseMargonemProfileId(preview.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      return {
        actorUserId,
        fetchedAt: preview.fetchedAt,
        id: pendingImportId,
        jarunaCharacters,
        profileId: profileId.value,
      };
    });

const createOwnedAccountFromPendingImportWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    displayName,
    pending,
  }: CreateOwnedAccountFromPendingImportInput): Effect.Effect<
    OwnedMargonemAccountSummary,
    DuplicateMargonemAccountError | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createOwnedAccountFromPendingImportEffect() {
      const operation = "createOwnedAccountFromPendingImport" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* createOwnedAccountFromPendingImportTransaction() {
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
          const existingRows = yield* persistenceQueryUnsafe(existingSelect);

          const [existing] = existingRows;

          if (existing !== undefined) {
            return existing.ownerUserId === appUserIdToString(actorUserId)
              ? ({ _tag: "MargonemAccountAlreadyOwnedByActor" } as const)
              : ({ _tag: "MargonemAccountOwnedByAnotherUser" } as const);
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
          const accountRows = yield* persistenceQueryUnsafe(insert);

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
            yield* persistenceQueryUnsafe(characterInsert);
          }

          const update = tx
            .update(margonemAccountImportPreview)
            .set({ confirmedAt: new Date() })
            .where(
              eq(
                margonemAccountImportPreview.id,
                pendingImportIdToNumber(pending.id)
              )
            );
          yield* persistenceQueryUnsafe(update);

          return {
            accountId: account.id,
            characterCount: pending.jarunaCharacters.length,
            displayName,
            generatedProfileUrl: toMargonemProfileUrl(pending.profileId),
            lastFetchedAt: pending.fetchedAt,
            profileId: pending.profileId,
          };
        })
      );

      const result = yield* persistenceQuery(operation, transaction);

      if (
        "_tag" in result &&
        (result._tag === "MargonemAccountAlreadyOwnedByActor" ||
          result._tag === "MargonemAccountOwnedByAnotherUser" ||
          result._tag === "MargonemAccountAlreadySharedWithActor")
      ) {
        return yield* Effect.fail(result);
      }

      return result;
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
      const rows = yield* persistenceQuery(operation, select);

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

export const DrizzleEffectAccountImportStoreLayer: Layer.Layer<
  EffectAccountImportStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectAccountImportStore,
  EffectDatabase.useSync((database) =>
    EffectAccountImportStore.of({
      createOwnedAccountFromPendingImport: namedStoreMethod(
        "AccountImportStore.createOwnedAccountFromPendingImport",
        createOwnedAccountFromPendingImportWithDatabase(database)
      ),
      createPendingImport: namedStoreMethod(
        "AccountImportStore.createPendingImport",
        createPendingImportWithDatabase(database)
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
    })
  )
);
