/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { announcement } from "@tepirek-revamped/db/schema/announcement";
import { user } from "@tepirek-revamped/db/schema/auth";
import { desc, eq } from "drizzle-orm";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core/errors";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { AnnouncementStoreError } from "./announcement-store-error.js";

export interface CreateAnnouncementInput {
  readonly createdAt: Date;
  readonly description: string;
  readonly title: string;
  readonly userId: string;
}

export interface DeleteAnnouncementInput {
  readonly id: number;
}

const persistenceQuery = <A, R>(
  operation: string,
  self: Effect.Effect<A, EffectDrizzleQueryError, R>
): Effect.Effect<A, AnnouncementStoreError, R> =>
  self.pipe(
    Effect.mapError((cause) => new AnnouncementStoreError({ cause, operation }))
  );

const createWithDatabase =
  (database: EffectPgDatabase) =>
  ({ createdAt, description, title, userId }: CreateAnnouncementInput) =>
    persistenceQuery(
      "createAnnouncement",
      database.insert(announcement).values({
        createdAt,
        description,
        title,
        userId,
      })
    );

const deleteWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id }: DeleteAnnouncementInput) =>
    persistenceQuery(
      "deleteAnnouncement",
      database.delete(announcement).where(eq(announcement.id, id))
    );

const listWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery(
    "listAnnouncements",
    database
      .select({
        createdAt: announcement.createdAt,
        description: announcement.description,
        id: announcement.id,
        title: announcement.title,
        user: {
          id: user.id,
          image: user.image,
          name: user.name,
        },
      })
      .from(announcement)
      .leftJoin(user, eq(announcement.userId, user.id))
      .orderBy(desc(announcement.createdAt))
  );

export class AnnouncementStore extends Context.Service<
  AnnouncementStore,
  {
    readonly create: (
      input: CreateAnnouncementInput
    ) => Effect.Effect<void, AnnouncementStoreError>;
    readonly delete: (
      input: DeleteAnnouncementInput
    ) => Effect.Effect<void, AnnouncementStoreError>;
    readonly list: () => Effect.Effect<
      readonly {
        readonly createdAt: Date;
        readonly description: string;
        readonly id: number;
        readonly title: string;
        readonly user: {
          readonly id: string;
          readonly image: string | null;
          readonly name: string | null;
        } | null;
      }[],
      AnnouncementStoreError
    >;
  }
>()("@tepirek-revamped/api/AnnouncementStore") {}

export const AnnouncementStoreLayer: Layer.Layer<
  AnnouncementStore,
  never,
  EffectDatabase
> = Layer.effect(
  AnnouncementStore,
  EffectDatabase.useSync((database) =>
    AnnouncementStore.of({
      create: Effect.fn("AnnouncementStore.create")(
        createWithDatabase(database)
      ),
      delete: Effect.fn("AnnouncementStore.delete")(
        deleteWithDatabase(database)
      ),
      list: Effect.fn("AnnouncementStore.list")(listWithDatabase(database)),
    })
  )
);
