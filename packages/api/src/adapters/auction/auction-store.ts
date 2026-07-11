/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { auction } from "@tepirek-revamped/db/schema/auction";
import { user } from "@tepirek-revamped/db/schema/auth";
import { and, count, countDistinct, eq } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  AuctionConflict,
  AuctionForbidden,
  AuctionNotFound,
} from "../../protocol/auction/http-api-contract.js";
import { AuctionStoreError } from "./auction-store-error.js";

export interface AuctionGroupInput {
  readonly profession: string;
  readonly type: string;
}
export interface RemoveSignupInput {
  readonly actorUserId: string;
  readonly id: number;
}
export interface ToggleSignupInput {
  readonly actorUserId: string;
  readonly column: number;
  readonly level: number;
  readonly profession: string;
  readonly round: number;
  readonly type: string;
}

const persistenceQuery = <A>(
  operation: string,
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, AuctionStoreError> =>
  (self as Effect.Effect<A, unknown, never>).pipe(
    Effect.mapError((cause) => new AuctionStoreError({ cause, operation }))
  );

const getSignupsWithDatabase =
  (database: EffectPgDatabase) => (input: AuctionGroupInput) =>
    persistenceQuery(
      "getAuctionSignups",
      database
        .select({
          column: auction.column,
          createdAt: auction.createdAt,
          id: auction.id,
          level: auction.level,
          round: auction.round,
          userId: auction.userId,
          userImage: user.image,
          userName: user.name,
        })
        .from(auction)
        .leftJoin(user, eq(auction.userId, user.id))
        .where(
          and(
            eq(auction.profession, input.profession),
            eq(auction.type, input.type)
          )
        )
        .orderBy(auction.createdAt)
    );

const getStatsWithDatabase =
  (database: EffectPgDatabase) => (input: AuctionGroupInput) =>
    Effect.gen(function* getStatsWithDatabase() {
      const result = yield* persistenceQuery(
        "getAuctionStats",
        database
          .select({
            totalSignups: count(),
            uniqueUsers: countDistinct(auction.userId),
          })
          .from(auction)
          .where(
            and(
              eq(auction.profession, input.profession),
              eq(auction.type, input.type)
            )
          )
      );
      const [stats] = result;
      return stats ?? { totalSignups: 0, uniqueUsers: 0 };
    });

const removeSignupWithDatabase =
  (database: EffectPgDatabase) =>
  ({ actorUserId, id }: RemoveSignupInput) =>
    Effect.gen(function* removeSignupWithDatabase() {
      const signups = yield* persistenceQuery(
        "findAuctionSignup",
        database
          .select({ userId: auction.userId })
          .from(auction)
          .where(eq(auction.id, id))
          .limit(1)
      );
      const [signup] = signups;
      if (!signup) {
        return yield* new AuctionNotFound({ message: "Zapis nie znaleziony" });
      }
      if (signup.userId !== actorUserId) {
        return yield* new AuctionForbidden({
          message: "Nie masz uprawnień do usunięcia tego zapisu",
        });
      }
      yield* persistenceQuery(
        "removeAuctionSignup",
        database.delete(auction).where(eq(auction.id, id))
      );
      return { success: true as const };
    });

const toggleSignupWithDatabase =
  (database: EffectPgDatabase) => (input: ToggleSignupInput) =>
    Effect.gen(function* toggleSignupWithDatabase() {
      const existing = yield* persistenceQuery(
        "findAuctionSlot",
        database
          .select({ id: auction.id, userId: auction.userId })
          .from(auction)
          .where(
            and(
              eq(auction.profession, input.profession),
              eq(auction.type, input.type),
              eq(auction.level, input.level),
              eq(auction.round, input.round),
              eq(auction.column, input.column)
            )
          )
          .limit(1)
      );
      const [cell] = existing;
      if (cell) {
        if (cell.userId === input.actorUserId) {
          yield* persistenceQuery(
            "removeOwnAuctionSignup",
            database.delete(auction).where(eq(auction.id, cell.id))
          );
          return { action: "removed" as const };
        }
        return yield* new AuctionConflict({
          message: "To pole jest już zajęte",
        });
      }
      const inserted = yield* persistenceQuery(
        "addAuctionSignup",
        database
          .insert(auction)
          .values({
            column: input.column,
            level: input.level,
            profession: input.profession,
            round: input.round,
            type: input.type,
            userId: input.actorUserId,
          })
          .onConflictDoNothing()
          .returning({ id: auction.id })
      );
      if (inserted.length === 0) {
        return yield* new AuctionConflict({
          message: "To pole jest już zajęte",
        });
      }
      return { action: "added" as const };
    });

export class AuctionStore extends Context.Service<
  AuctionStore,
  {
    readonly getSignups: (input: AuctionGroupInput) => Effect.Effect<
      readonly {
        readonly column: number;
        readonly createdAt: Date;
        readonly id: number;
        readonly level: number;
        readonly round: number;
        readonly userId: string;
        readonly userImage: string | null;
        readonly userName: string | null;
      }[],
      AuctionStoreError
    >;
    readonly getStats: (
      input: AuctionGroupInput
    ) => Effect.Effect<
      { readonly totalSignups: number; readonly uniqueUsers: number },
      AuctionStoreError
    >;
    readonly removeSignup: (
      input: RemoveSignupInput
    ) => Effect.Effect<
      { readonly success: true },
      AuctionForbidden | AuctionNotFound | AuctionStoreError
    >;
    readonly toggleSignup: (
      input: ToggleSignupInput
    ) => Effect.Effect<
      { readonly action: "added" | "removed" },
      AuctionConflict | AuctionStoreError
    >;
  }
>()("@tepirek-revamped/api/AuctionStore") {}

export const AuctionStoreLayer: Layer.Layer<
  AuctionStore,
  never,
  EffectDatabase
> = Layer.effect(
  AuctionStore,
  EffectDatabase.useSync((database) =>
    AuctionStore.of({
      getSignups: Effect.fn("AuctionStore.getSignups")(
        getSignupsWithDatabase(database)
      ),
      getStats: Effect.fn("AuctionStore.getStats")(
        getStatsWithDatabase(database)
      ),
      removeSignup: Effect.fn("AuctionStore.removeSignup")(
        removeSignupWithDatabase(database)
      ),
      toggleSignup: Effect.fn("AuctionStore.toggleSignup")(
        toggleSignupWithDatabase(database)
      ),
    })
  )
);
