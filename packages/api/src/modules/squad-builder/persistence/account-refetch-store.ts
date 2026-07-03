import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { and, count, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../account-display-name.js";
import type { ApplyAccountRefetchOutput } from "../account-refetch/apply-account-refetch.js";
import { EffectAccountRefetchStore } from "../account-refetch/effect-account-refetch-store.js";
import type { AppUserId } from "../app-user-id.js";
import { appUserIdToString } from "../app-user-id.js";
import { firecrawlYearMonthToString } from "../firecrawl-year-month.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import {
  margonemAccountIdToNumber,
  parseMargonemAccountId,
} from "../margonem-account-id.js";
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
import {
  parsePendingMargonemAccountRefetchId,
  pendingRefetchIdToNumber,
} from "../pending-margonem-account-refetch-id.js";
import { isError } from "../result.js";
import type {
  EffectSquadBuilderPersistenceUnavailable} from "../squad-groups/squad-group-errors.js";
import {
  ActorDoesNotOwnMargonemAccount,
  MargonemAccountNotFound,
  PendingMargonemAccountRefetchNotFound,
} from "../squad-groups/squad-group-errors.js";
import type {
  ApplyRefetchedAccountInput,
  CreatePendingMargonemAccountRefetchInput,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  RefetchableMargonemAccount,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
} from "../squad-groups/squad-group-store.js";
import {
  failPersistence,
  namedStoreMethod,
  parsePersistedAppUserId,
  persistenceQuery,
  persistenceQueryUnsafe,
  usedFirecrawlRequestStatuses,
} from "./persistence-query.js";

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

const getAccountForRefetchWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    actorUserId,
  }: {
    readonly actorUserId: AppUserId;
    readonly accountId: MargonemAccountId;
  }): Effect.Effect<
    RefetchableMargonemAccount,
    | MargonemAccountNotFound
    | ActorDoesNotOwnMargonemAccount
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* getAccountForRefetchEffect() {
      const operation = "getAccountForRefetch" as const;
      const accountIdNumber = margonemAccountIdToNumber(accountId);
      const accountSelect = database
        .select({
          displayName: margonemAccount.displayName,
          ownerUserId: margonemAccount.ownerUserId,
          profileId: margonemAccount.profileId,
        })
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

      const characterSelect = database
        .select({
          affectedSquadCount: sql<number>`count(${squadCharacter.id})::int`,
          avatarUrl: margonemCharacter.avatarUrl,
          characterId: margonemCharacter.characterId,
          id: margonemCharacter.id,
          level: margonemCharacter.level,
          name: margonemCharacter.name,
          profession: margonemCharacter.profession,
          world: margonemCharacter.world,
        })
        .from(margonemCharacter)
        .leftJoin(
          squadCharacter,
          eq(squadCharacter.characterId, margonemCharacter.id)
        )
        .where(eq(margonemCharacter.accountId, accountIdNumber))
        .groupBy(margonemCharacter.id);
      const characterRows = yield* persistenceQuery(operation, characterSelect);

      const displayName = parseAccountDisplayName(account.displayName);

      if (isError(displayName)) {
        return yield* failPersistence(operation, displayName.error);
      }

      const profileId = parseMargonemProfileId(account.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      const currentCharacters: RefetchableMargonemAccount["currentCharacters"][number][] =
        [];

      for (const row of characterRows) {
        const margonemCharacterId = parseMargonemCharacterId(row.characterId);

        if (isError(margonemCharacterId)) {
          return yield* failPersistence(operation, margonemCharacterId.error);
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

        currentCharacters.push({
          affectedSquadCount: row.affectedSquadCount ?? 0,
          avatarUrl: row.avatarUrl,
          databaseCharacterId: row.id,
          level: level.value,
          margonemCharacterId: margonemCharacterId.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      return {
        accountId,
        currentCharacters,
        displayName: displayName.value,
        profileId: profileId.value,
      };
    });

const createPendingRefetchWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    accountId,
    actorUserId,
    diff,
    expiresAt,
    fetchedAt,
    firecrawlCreditsUsed,
    latestCharacters,
    profileId,
  }: CreatePendingMargonemAccountRefetchInput): Effect.Effect<
    PendingMargonemAccountRefetch,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createPendingRefetchEffect() {
      const operation = "createPendingRefetch" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* createPendingRefetchTransaction() {
          const insert = tx
            .insert(margonemAccountRefetchPreview)
            .values({
              accountId: margonemAccountIdToNumber(accountId),
              actorUserId: appUserIdToString(actorUserId),
              diffJson: JSON.stringify(diff),
              expiresAt,
              fetchedAt,
              firecrawlCreditsUsed,
              profileId: profileIdToNumber(profileId),
            })
            .returning({ id: margonemAccountRefetchPreview.id });
          const insertedRows = yield* persistenceQueryUnsafe(insert);

          const [preview] = insertedRows;

          if (preview === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Failed to create pending refetch preview")
            );
          }

          if (latestCharacters.length > 0) {
            const characterInsert = tx
              .insert(margonemAccountRefetchPreviewCharacter)
              .values(
                latestCharacters.map((character) => ({
                  avatarUrl: character.avatarUrl,
                  characterId: characterIdToNumber(character.characterId),
                  level: levelToNumber(character.level),
                  name: character.name,
                  profession: character.profession,
                  refetchPreviewId: preview.id,
                  world: character.world,
                }))
              );
            yield* persistenceQueryUnsafe(characterInsert);
          }

          const pendingRefetchId = parsePendingMargonemAccountRefetchId(
            preview.id
          );

          if (isError(pendingRefetchId)) {
            return yield* failPersistence(operation, pendingRefetchId.error);
          }

          return { id: pendingRefetchId.value };
        })
      );

      return yield* persistenceQuery(operation, transaction);
    });

const findPendingRefetchForApplyWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    now,
    refetchPreviewId,
  }: {
    readonly actorUserId: AppUserId;
    readonly refetchPreviewId: PendingMargonemAccountRefetch["id"];
    readonly now: Date;
  }): Effect.Effect<
    PendingMargonemAccountRefetchForApply,
    | PendingMargonemAccountRefetchNotFound
    | EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* findPendingRefetchForApplyEffect() {
      const operation = "findPendingRefetchForApply" as const;
      const previewSelect = database
        .select({
          accountId: margonemAccountRefetchPreview.accountId,
          actorUserId: margonemAccountRefetchPreview.actorUserId,
          fetchedAt: margonemAccountRefetchPreview.fetchedAt,
          id: margonemAccountRefetchPreview.id,
          profileId: margonemAccountRefetchPreview.profileId,
        })
        .from(margonemAccountRefetchPreview)
        .where(
          and(
            eq(
              margonemAccountRefetchPreview.id,
              pendingRefetchIdToNumber(refetchPreviewId)
            ),
            eq(
              margonemAccountRefetchPreview.actorUserId,
              appUserIdToString(actorUserId)
            ),
            isNull(margonemAccountRefetchPreview.appliedAt),
            gt(margonemAccountRefetchPreview.expiresAt, now)
          )
        )
        .limit(1);
      const previewRows = yield* persistenceQuery(operation, previewSelect);

      const [preview] = previewRows;

      if (preview === undefined) {
        return yield* new PendingMargonemAccountRefetchNotFound();
      }

      const characterSelect = database
        .select({
          avatarUrl: margonemAccountRefetchPreviewCharacter.avatarUrl,
          characterId: margonemAccountRefetchPreviewCharacter.characterId,
          level: margonemAccountRefetchPreviewCharacter.level,
          name: margonemAccountRefetchPreviewCharacter.name,
          profession: margonemAccountRefetchPreviewCharacter.profession,
          world: margonemAccountRefetchPreviewCharacter.world,
        })
        .from(margonemAccountRefetchPreviewCharacter)
        .where(
          eq(
            margonemAccountRefetchPreviewCharacter.refetchPreviewId,
            preview.id
          )
        );
      const characterRows = yield* persistenceQuery(operation, characterSelect);

      const latestCharacters = [];

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

        latestCharacters.push({
          avatarUrl: row.avatarUrl,
          characterId: characterId.value,
          level: level.value,
          name: row.name,
          profession: profession.value,
          world: world.value,
        });
      }

      const accountId = parseMargonemAccountId(preview.accountId);

      if (isError(accountId)) {
        return yield* failPersistence(operation, accountId.error);
      }

      const persistedActorUserId = yield* parsePersistedAppUserId(
        operation,
        preview.actorUserId
      );
      const profileId = parseMargonemProfileId(preview.profileId);

      if (isError(profileId)) {
        return yield* failPersistence(operation, profileId.error);
      }

      return {
        accountId: accountId.value,
        actorUserId: persistedActorUserId,
        fetchedAt: preview.fetchedAt,
        id: refetchPreviewId,
        latestCharacters,
        profileId: profileId.value,
      };
    });

const markPendingRefetchAppliedWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    appliedAt,
    refetchPreviewId,
  }: MarkPendingMargonemAccountRefetchAppliedInput): Effect.Effect<
    void,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > => {
    const operation = "markPendingRefetchApplied" as const;
    const update = database
      .update(margonemAccountRefetchPreview)
      .set({ appliedAt })
      .where(
        eq(
          margonemAccountRefetchPreview.id,
          pendingRefetchIdToNumber(refetchPreviewId)
        )
      );
    return persistenceQuery(operation, update).pipe(Effect.asVoid);
  };

const applyRefetchedAccountWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    now,
    pendingRefetch,
  }: ApplyRefetchedAccountInput): Effect.Effect<
    ApplyAccountRefetchOutput,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* applyRefetchedAccountEffect() {
      const operation = "applyRefetchedAccount" as const;
      const transaction = database.transaction((tx) =>
        Effect.gen(function* applyRefetchedAccountTransaction() {
          const accountIdNumber = margonemAccountIdToNumber(
            pendingRefetch.accountId
          );

          yield* persistenceQueryUnsafe(
            tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`margonem-refetch:${accountIdNumber}`}))`
            )
          );

          const accountSelect = tx
            .select({ id: margonemAccount.id })
            .from(margonemAccount)
            .where(
              and(
                eq(margonemAccount.id, accountIdNumber),
                eq(margonemAccount.ownerUserId, appUserIdToString(actorUserId))
              )
            )
            .limit(1);
          const accountRows = yield* persistenceQueryUnsafe(accountSelect);

          if (accountRows[0] === undefined) {
            return yield* failPersistence(
              operation,
              new Error("Account not found while applying refetch")
            );
          }

          const currentSelect = tx
            .select({
              avatarUrl: margonemCharacter.avatarUrl,
              characterId: margonemCharacter.characterId,
              id: margonemCharacter.id,
              level: margonemCharacter.level,
              name: margonemCharacter.name,
              profession: margonemCharacter.profession,
            })
            .from(margonemCharacter)
            .where(eq(margonemCharacter.accountId, accountIdNumber));
          const currentRows = yield* persistenceQueryUnsafe(currentSelect);

          const currentByCharacterId = new Map<
            number,
            (typeof currentRows)[number]
          >();

          for (const current of currentRows) {
            currentByCharacterId.set(current.characterId, current);
          }

          const latestByCharacterId = new Map<number, true>();
          const charactersToInsert = [];
          const charactersToUpdate = [];
          const removedDatabaseCharacterIds = [];

          for (const latest of pendingRefetch.latestCharacters) {
            const latestCharacterId = characterIdToNumber(latest.characterId);
            const latestLevel = levelToNumber(latest.level);
            const current = currentByCharacterId.get(latestCharacterId);
            latestByCharacterId.set(latestCharacterId, true);

            if (current === undefined) {
              charactersToInsert.push({
                accountId: accountIdNumber,
                avatarUrl: latest.avatarUrl,
                characterId: latestCharacterId,
                level: latestLevel,
                name: latest.name,
                profession: latest.profession,
                updatedAt: now,
                world: latest.world,
              });
              continue;
            }

            const changed =
              current.avatarUrl !== latest.avatarUrl ||
              current.level !== latestLevel ||
              current.name !== latest.name ||
              current.profession !== latest.profession;

            if (changed) {
              charactersToUpdate.push({
                avatarUrl: latest.avatarUrl,
                databaseCharacterId: current.id,
                level: latestLevel,
                name: latest.name,
                profession: latest.profession,
                world: latest.world,
              });
            }
          }

          if (charactersToInsert.length > 0) {
            yield* persistenceQueryUnsafe(
              tx.insert(margonemCharacter).values(charactersToInsert)
            );
          }

          for (const character of charactersToUpdate) {
            yield* persistenceQueryUnsafe(
              tx
                .update(margonemCharacter)
                .set({
                  avatarUrl: character.avatarUrl,
                  level: character.level,
                  name: character.name,
                  profession: character.profession,
                  updatedAt: now,
                  world: character.world,
                })
                .where(eq(margonemCharacter.id, character.databaseCharacterId))
            );
          }

          for (const current of currentRows) {
            if (!latestByCharacterId.has(current.characterId)) {
              removedDatabaseCharacterIds.push(current.id);
            }
          }

          let removedSquadCharacterCount = 0;

          if (removedDatabaseCharacterIds.length > 0) {
            const affectedGroupSelect = tx
              .select({ groupId: squadCharacter.squadGroupId })
              .from(squadCharacter)
              .where(
                inArray(squadCharacter.characterId, removedDatabaseCharacterIds)
              );
            const affectedGroups =
              yield* persistenceQueryUnsafe(affectedGroupSelect);

            const affectedGroupIds = [
              ...new Set(affectedGroups.map((group) => group.groupId)),
            ];
            const removedPlacementsDelete = tx
              .delete(squadCharacter)
              .where(
                inArray(squadCharacter.characterId, removedDatabaseCharacterIds)
              )
              .returning({ id: squadCharacter.id });
            const removedPlacements = yield* persistenceQueryUnsafe(
              removedPlacementsDelete
            );

            removedSquadCharacterCount = removedPlacements.length;

            if (affectedGroupIds.length > 0) {
              yield* persistenceQueryUnsafe(
                tx
                  .update(squadGroup)
                  .set({ updatedAt: now })
                  .where(inArray(squadGroup.id, affectedGroupIds))
              );
            }

            yield* persistenceQueryUnsafe(
              tx
                .delete(margonemCharacter)
                .where(
                  inArray(margonemCharacter.id, removedDatabaseCharacterIds)
                )
            );
          }

          yield* persistenceQueryUnsafe(
            tx
              .update(margonemAccount)
              .set({ lastFetchedAt: pendingRefetch.fetchedAt, updatedAt: now })
              .where(eq(margonemAccount.id, accountIdNumber))
          );

          return {
            accountId: pendingRefetch.accountId,
            addedCharacterCount: charactersToInsert.length,
            lastFetchedAt: pendingRefetch.fetchedAt,
            profileId: pendingRefetch.profileId,
            removedCharacterCount: removedDatabaseCharacterIds.length,
            removedSquadCharacterCount,
            updatedCharacterCount: charactersToUpdate.length,
          };
        })
      );

      return yield* persistenceQuery(operation, transaction);
    });

export const DrizzleEffectAccountRefetchStoreLayer: Layer.Layer<
  EffectAccountRefetchStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectAccountRefetchStore,
  EffectDatabase.useSync((database) =>
    EffectAccountRefetchStore.of({
      applyRefetchedAccount: namedStoreMethod(
        "AccountRefetchStore.applyRefetchedAccount",
        applyRefetchedAccountWithDatabase(database)
      ),
      createPendingRefetch: namedStoreMethod(
        "AccountRefetchStore.createPendingRefetch",
        createPendingRefetchWithDatabase(database)
      ),
      findPendingRefetchForApply: namedStoreMethod(
        "AccountRefetchStore.findPendingRefetchForApply",
        findPendingRefetchForApplyWithDatabase(database)
      ),
      getAccountForRefetch: namedStoreMethod(
        "AccountRefetchStore.getAccountForRefetch",
        getAccountForRefetchWithDatabase(database)
      ),
      markPendingRefetchApplied: namedStoreMethod(
        "AccountRefetchStore.markPendingRefetchApplied",
        markPendingRefetchAppliedWithDatabase(database)
      ),
      markRequestFailed: namedStoreMethod(
        "AccountRefetchStore.markRequestFailed",
        markRequestFailedWithDatabase(database)
      ),
      markRequestSucceeded: namedStoreMethod(
        "AccountRefetchStore.markRequestSucceeded",
        markRequestSucceededWithDatabase(database)
      ),
      reserveRequest: namedStoreMethod(
        "AccountRefetchStore.reserveRequest",
        reserveRequestWithDatabase(database)
      ),
    })
  )
);
