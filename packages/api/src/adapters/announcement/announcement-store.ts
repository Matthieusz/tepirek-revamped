/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { announcement } from "@tepirek-revamped/db/schema/announcement";
import { user } from "@tepirek-revamped/db/schema/auth";
import { desc, eq } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schema from "effect/Schema";

import { AnnouncementId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { AnnouncementSummary } from "../../protocol/announcement/http-api-contract.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";
import { AnnouncementStoreError } from "./announcement-store-error.ts";

export interface CreateAnnouncementInput {
  readonly createdAt: Date;
  readonly description: string;
  readonly title: string;
  readonly userId: AppUserId;
}

export interface DeleteAnnouncementInput {
  readonly id: AnnouncementId;
}

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new AnnouncementStoreError(input)
);
const decodePersisted =
  <A>(schema: Schema.ConstraintDecoder<A, never>) =>
  (input: unknown) =>
    decodePersistedValue(
      schema,
      input,
      "listAnnouncements.decode",
      (error) => new AnnouncementStoreError(error)
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
      Effect.all(
        rows.map((row) =>
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
    )
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
      readonly (typeof AnnouncementSummary.Type)[],
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
