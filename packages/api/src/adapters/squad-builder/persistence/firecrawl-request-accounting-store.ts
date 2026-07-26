import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { firecrawlProfileScrapeRequest } from "@tepirek-revamped/db/schema/squad-builder";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { appUserIdToString } from "../../../domain/squad-builder/app-user-id.ts";
import { firecrawlYearMonthToString } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import { profileIdToNumber } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { FirecrawlRequestAccountingStoreService } from "../../../services/squad-builder/firecrawl-request-accounting-store.ts";
import type {
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  ReserveFirecrawlRequestInput,
} from "../../../services/squad-builder/firecrawl-request-accounting-store.ts";
import type { EffectSquadBuilderPersistenceUnavailable } from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import { FirecrawlMonthlyBudgetExhausted } from "../../../services/squad-builder/squad-groups/squad-group-errors.ts";
import {
  failPersistence,
  namedStoreMethod,
  persistenceQuery,
  usedFirecrawlRequestStatuses,
} from "./persistence-query.ts";

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
        const usageRows = yield* tx
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
        const usedRequests = usageRows[0]?.usedRequests ?? 0;

        if (usedRequests >= monthlyRequestBudget) {
          return yield* new FirecrawlMonthlyBudgetExhausted({
            monthlyRequestBudget,
            usedRequests,
            yearMonth,
          });
        }

        const insertedRows = yield* tx
          .insert(firecrawlProfileScrapeRequest)
          .values({
            profileId: profileIdToNumber(profileId),
            requestedByUserId: appUserIdToString(requestedByUserId),
            status: "reserved",
            yearMonth: yearMonthText,
          })
          .returning({ id: firecrawlProfileScrapeRequest.id });
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
  > =>
    persistenceQuery(
      "markRequestSucceeded",
      database
        .update(firecrawlProfileScrapeRequest)
        .set({
          cacheState,
          completedAt,
          creditsUsed,
          firecrawlStatusCode,
          status: "succeeded",
        })
        .where(eq(firecrawlProfileScrapeRequest.id, requestId))
    ).pipe(Effect.asVoid);

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
  > =>
    persistenceQuery(
      "markRequestFailed",
      database
        .update(firecrawlProfileScrapeRequest)
        .set({ completedAt, errorTag, status: "failed" })
        .where(eq(firecrawlProfileScrapeRequest.id, requestId))
    ).pipe(Effect.asVoid);

/** Drizzle implementation of transactional Firecrawl request accounting. */
export const DrizzleFirecrawlRequestAccountingStoreServiceLayer: Layer.Layer<
  FirecrawlRequestAccountingStoreService,
  never,
  EffectDatabase
> = Layer.effect(
  FirecrawlRequestAccountingStoreService,
  EffectDatabase.useSync((database) =>
    FirecrawlRequestAccountingStoreService.of({
      markRequestFailed: namedStoreMethod(
        "FirecrawlRequestAccountingStore.markRequestFailed",
        markRequestFailedWithDatabase(database)
      ),
      markRequestSucceeded: namedStoreMethod(
        "FirecrawlRequestAccountingStore.markRequestSucceeded",
        markRequestSucceededWithDatabase(database)
      ),
      reserveRequest: namedStoreMethod(
        "FirecrawlRequestAccountingStore.reserveRequest",
        reserveRequestWithDatabase(database)
      ),
    })
  )
);
