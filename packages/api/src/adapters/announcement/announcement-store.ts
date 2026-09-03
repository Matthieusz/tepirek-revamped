/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { announcement } from "@tepirek-revamped/db/schema/announcement";
import { user } from "@tepirek-revamped/db/schema/auth";
import { desc, eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import { AnnouncementId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { AnnouncementStore } from "../../services/announcement/announcement-store.ts";
import type {
  CreateAnnouncementInput,
  DeleteAnnouncementInput,
} from "../../services/announcement/announcement-store.ts";
import { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
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
    "listAnnouncements.decode",
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
    (error) => new ApplicationDependencyUnavailable(error)
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
  ).pipe(
    Effect.flatMap((rows) =>
      // oxlint-disable-next-line unicorn/no-array-for-each unicorn/no-array-method-this-argument -- Effect.forEach sequences typed effects; this is not Array#forEach.
      Effect.forEach(rows, (row) =>
        Effect.gen(function* decodeAnnouncementRow() {
          const id = yield* decodePersisted(AnnouncementId)(row.id);
          if (row.user === null) {
            return { ...row, id, user: null };
          }
          const userId = yield* decodePersisted(AppUserId)(row.user.id);
          return {
            ...row,
            id,
            user: { ...row.user, id: userId },
          };
        })
      )
    )
  );

const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const AnnouncementStoreLayer: Layer.Layer<
  AnnouncementStore,
  never,
  EffectDatabase
> = Layer.effect(
  AnnouncementStore,
  getDatabaseSync((database) =>
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
