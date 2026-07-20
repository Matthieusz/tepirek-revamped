/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import { MIN_EARNINGS } from "@tepirek-revamped/config";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import { hero, userStats } from "@tepirek-revamped/db/schema/bet";
import { and, desc, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Num from "effect/Number";
import * as Schema from "effect/Schema";

import { EventId, HeroId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  VaultBadRequest,
  VaultPersistenceUnavailable,
} from "../../services/vault/vault-errors.ts";
import type {
  DistributeGoldInput,
  TogglePaidOutInput,
  VaultServiceInterface,
} from "../../services/vault/vault-service.ts";
import { VaultService } from "../../services/vault/vault-service.ts";
import { lockHeroLedger } from "./hero-ledger-lock.ts";
import {
  decodePersistedValue,
  mapPersistenceErrors,
} from "./persistence-query.ts";
import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "./persistence-query.ts";

const persistenceQuery = <A, E, R>(
  operation: string,
  self: Effect.Effect<A, E, R>
) =>
  mapPersistenceErrors(
    operation,
    self,
    (cause, failedOperation) =>
      new VaultPersistenceUnavailable({
        cause,
        operation: failedOperation,
      })
  );

const decodePersisted = <A>(
  schema: Schema.ConstraintDecoder<A, never>,
  input: unknown,
  operation: string
) =>
  decodePersistedValue(
    schema,
    input,
    operation,
    (cause, failedOperation) =>
      new VaultPersistenceUnavailable({ cause, operation: failedOperation })
  );

const decodeUserStatsRow = <
  T extends {
    readonly eventId: number;
    readonly heroId: number;
    readonly userId: string;
  },
>(
  row: T
) =>
  Effect.gen(function* decodeUserStatsRowEffect() {
    const eventId = yield* decodePersisted(
      EventId,
      row.eventId,
      "getUserStats.decode"
    );
    const heroId = yield* decodePersisted(
      HeroId,
      row.heroId,
      "getUserStats.decode"
    );
    const userId = yield* decodePersisted(
      AppUserId,
      row.userId,
      "getUserStats.decode"
    );
    return { ...row, eventId, heroId, userId };
  });

const getHeroEventWithDatabase = (database: Pick<EffectPgDatabase, "select">) =>
  Effect.fnUntraced(function* getHeroEvent(heroId: number, message: string) {
    const rows = yield* persistenceQuery(
      "getHeroEvent",
      database
        .select({ eventId: hero.eventId, name: hero.name })
        .from(hero)
        .where(eq(hero.id, heroId))
    );
    const [heroData] = rows;
    if (heroData === undefined) {
      return yield* new VaultBadRequest({ message });
    }
    return heroData;
  });

const distributeGoldWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* distributeGold({
    goldAmount,
    heroId,
  }: DistributeGoldInput) {
    const distribution = yield* persistenceQuery(
      "distributeGold",
      database.transaction(
        Effect.fnUntraced(function* distributeGoldTransaction(
          tx: TransactionDatabase
        ) {
          yield* lockHeroLedger(tx, heroId);
          const heroData = yield* getHeroEventWithDatabase(tx)(
            heroId,
            "Heros nie znaleziony"
          );
          const heroUserStats = yield* persistenceQuery(
            "distributeGold.loadStats",
            tx
              .select({
                id: userStats.id,
                points: userStats.points,
                userId: userStats.userId,
              })
              .from(userStats)
              .where(eq(userStats.heroId, heroId))
          );
          if (heroUserStats.length === 0) {
            return yield* new VaultBadRequest({
              message: "Brak obstawień dla tego herosa",
            });
          }
          const decodedPoints = yield* Effect.all(
            heroUserStats.map((stat) =>
              decodePersisted(
                Schema.NumberFromString,
                stat.points,
                "distributeGold.decode"
              )
            )
          );
          const totalPoints = Num.sumAll(decodedPoints);
          if (totalPoints <= 0) {
            return yield* new VaultBadRequest({
              message: "Suma punktów musi być większa od zera",
            });
          }
          const pointWorth = goldAmount / totalPoints;
          const storedPointWorth = pointWorth.toFixed(6);
          yield* tx
            .update(userStats)
            .set({
              earnings: sql`ROUND((${userStats.points}) * ${storedPointWorth}, 2)`,
            })
            .where(eq(userStats.heroId, heroId));
          yield* tx
            .update(hero)
            .set({ pointWorth: storedPointWorth })
            .where(eq(hero.id, heroId));
          const decodedPointWorth = yield* decodePersisted(
            Schema.NumberFromString,
            storedPointWorth,
            "distributeGold.decode"
          );
          return {
            heroName: heroData.name,
            pointWorth: decodedPointWorth,
            totalPoints,
            usersUpdated: heroUserStats.length,
          };
        })
      )
    );
    const decodedHeroId = yield* decodePersisted(
      HeroId,
      heroId,
      "distributeGold.decode"
    );
    return {
      goldAmount,
      heroId: decodedHeroId,
      heroName: distribution.heroName,
      pointWorth: distribution.pointWorth,
      success: true as const,
      totalPoints: distribution.totalPoints,
      usersUpdated: distribution.usersUpdated,
    };
  });

const getUserStatsWithDatabase =
  (database: EffectPgDatabase) => (eventId?: number) => {
    if (eventId !== undefined) {
      return persistenceQuery(
        "getUserStats",
        database.select().from(userStats).where(eq(userStats.eventId, eventId))
      ).pipe(
        Effect.flatMap((rows) => Effect.all(rows.map(decodeUserStatsRow)))
      );
    }
    return persistenceQuery(
      "getUserStats",
      database.select().from(userStats)
    ).pipe(Effect.flatMap((rows) => Effect.all(rows.map(decodeUserStatsRow))));
  };

const getVaultWithDatabase =
  (database: EffectPgDatabase) => (eventId?: number) => {
    const conditions = [];
    if (eventId !== undefined) {
      conditions.push(eq(userStats.eventId, eventId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    return persistenceQuery(
      "getVault",
      database
        .select({
          paidOut: sql<boolean>`BOOL_AND(${userStats.paidOut})`.as("paid_out"),
          totalEarnings: sql<string>`SUM(${userStats.earnings})`.as(
            "total_earnings"
          ),
          userId: userStats.userId,
          userImage: user.image,
          userName: user.name,
        })
        .from(userStats)
        .innerJoin(user, eq(userStats.userId, user.id))
        .where(whereClause)
        .groupBy(userStats.userId, user.name, user.image)
        .having(sql`SUM(${userStats.earnings}) >= ${MIN_EARNINGS}`)
        .orderBy(desc(sql`SUM(${userStats.earnings})`))
    ).pipe(
      Effect.flatMap((rows) =>
        Effect.all(
          rows.map((row) =>
            decodePersisted(AppUserId, row.userId, "getVault.decode").pipe(
              Effect.map((userId) => ({ ...row, userId }))
            )
          )
        )
      )
    );
  };

const togglePaidOutWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* togglePaidOut(input: TogglePaidOutInput) {
    yield* persistenceQuery(
      "togglePaidOut",
      database
        .update(userStats)
        .set({ paidOut: input.paidOut })
        .where(
          and(
            eq(userStats.userId, input.userId),
            eq(userStats.eventId, input.eventId)
          )
        )
    );
    return { success: true } as const;
  });

const makeService = (database: EffectPgDatabase): VaultServiceInterface => ({
  distributeGold: Effect.fn("VaultService.distributeGold")(
    (input: DistributeGoldInput) => distributeGoldWithDatabase(database)(input)
  ),
  getUserStats: Effect.fn("VaultService.getUserStats")((eventId?: number) =>
    getUserStatsWithDatabase(database)(eventId)
  ),
  getVault: Effect.fn("VaultService.getVault")((eventId?: number) =>
    getVaultWithDatabase(database)(eventId)
  ),
  togglePaidOut: Effect.fn("VaultService.togglePaidOut")(
    (input: TogglePaidOutInput) => togglePaidOutWithDatabase(database)(input)
  ),
});

export const DrizzleVaultServiceLayer: Layer.Layer<
  VaultService,
  never,
  EffectDatabase
> = Layer.effect(
  VaultService,
  EffectDatabase.useSync((database) => VaultService.of(makeService(database)))
);
