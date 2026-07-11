/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import { MIN_EARNINGS } from "@tepirek-revamped/config";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import { hero, userStats } from "@tepirek-revamped/db/schema/bet";
import { and, desc, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  VaultBadRequest,
  VaultPersistenceUnavailable,
} from "../../services/vault/vault-errors.js";
import type {
  DistributeGoldInput,
  TogglePaidOutInput,
  VaultServiceInterface,
} from "../../services/vault/vault-service.js";
import { VaultService } from "../../services/vault/vault-service.js";
import type { EffectPgDatabase } from "./persistence-query.js";

const persistenceQuery = <A, E, R>(
  operation: string,
  self: Effect.Effect<A, E, R>
) =>
  self.pipe(
    Effect.mapError(
      (cause) => new VaultPersistenceUnavailable({ cause, operation })
    )
  );

const getHeroEventWithDatabase =
  (database: EffectPgDatabase) => (heroId: number, message: string) =>
    Effect.gen(function* getHeroEvent() {
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

const distributeGoldWithDatabase =
  (database: EffectPgDatabase) =>
  ({ goldAmount, heroId }: DistributeGoldInput) =>
    Effect.gen(function* distributeGold() {
      const heroData = yield* getHeroEventWithDatabase(database)(
        heroId,
        "Heros nie znaleziony"
      );
      const heroUserStats = yield* persistenceQuery(
        "distributeGold.loadStats",
        database
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
      const totalPoints = heroUserStats.reduce(
        (sum, stat) => sum + Number.parseFloat(stat.points),
        0
      );
      if (totalPoints <= 0) {
        return yield* new VaultBadRequest({
          message: "Suma punktów musi być większa od zera",
        });
      }
      const pointWorth = goldAmount / totalPoints;
      const storedPointWorth = pointWorth.toFixed(6);
      yield* persistenceQuery(
        "distributeGold",
        database.transaction((tx) =>
          Effect.gen(function* distributeGoldTransaction() {
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
          })
        )
      );
      return {
        goldAmount,
        heroId,
        heroName: heroData.name,
        pointWorth: Number(storedPointWorth),
        success: true as const,
        totalPoints,
        usersUpdated: heroUserStats.length,
      };
    });

const getUserStatsWithDatabase =
  (database: EffectPgDatabase) => (eventId?: number) => {
    if (eventId !== undefined) {
      return persistenceQuery(
        "getUserStats",
        database.select().from(userStats).where(eq(userStats.eventId, eventId))
      );
    }
    return persistenceQuery("getUserStats", database.select().from(userStats));
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
    );
  };

const togglePaidOutWithDatabase =
  (database: EffectPgDatabase) => (input: TogglePaidOutInput) =>
    Effect.gen(function* togglePaidOut() {
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
