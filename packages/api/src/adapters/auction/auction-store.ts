/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { auction } from "@tepirek-revamped/db/schema/auction";
import { user } from "@tepirek-revamped/db/schema/auth";
import { and, count, countDistinct, eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import { AuctionSignupId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationForbidden,
  ApplicationNotFound,
} from "../../services/application-errors.ts";
import { AuctionStore } from "../../services/auction/auction-store.ts";
import type {
  AuctionGroupInput,
  RemoveSignupInput,
  ToggleSignupInput,
} from "../../services/auction/auction-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new ApplicationDependencyUnavailable(input)
);
const decodePersisted = <A>(schema: Schema.ConstraintDecoder<A>) =>
  decodePersistedValue(
    schema,
    "getAuctionSignups.decode",
    (error) => new ApplicationDependencyUnavailable(error)
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
    ).pipe(
      Effect.flatMap((rows) =>
        Effect.all(
          rows.map((row) =>
            Effect.gen(function* decodeAuctionSignup() {
              const id = yield* decodePersisted(AuctionSignupId)(row.id);
              const userId = yield* decodePersisted(AppUserId)(row.userId);
              return { ...row, id, userId };
            })
          )
        )
      )
    );

const getStatsWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getStatsWithDatabase(input: AuctionGroupInput) {
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

const removeSignupWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* removeSignupWithDatabase({
    actorUserId,
    id,
  }: RemoveSignupInput) {
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
      return yield* new ApplicationNotFound({
        message: "Zapis nie znaleziony",
      });
    }
    if (signup.userId !== actorUserId) {
      return yield* new ApplicationForbidden({
        message: "Nie masz uprawnień do usunięcia tego zapisu",
      });
    }
    yield* persistenceQuery(
      "removeAuctionSignup",
      database.delete(auction).where(eq(auction.id, id))
    );
    return { success: true as const };
  });

const toggleSignupWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* toggleSignupWithDatabase(
    input: ToggleSignupInput
  ) {
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
      return yield* new ApplicationConflict({
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
      return yield* new ApplicationConflict({
        message: "To pole jest już zajęte",
      });
    }
    return { action: "added" as const };
  });

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
