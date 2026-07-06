/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import { slugifySkillRangeName } from "@tepirek-revamped/config";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import { professions, range, skills } from "@tepirek-revamped/db/schema/skills";
import { eq } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  SkillsBadRequest,
  SkillsConflict,
  SkillsPersistenceUnavailable,
} from "../../protocol/skills/http-api-contract.js";

export interface CreateProfessionInput {
  readonly name: string;
}
export interface CreateRangeInput {
  readonly image: string;
  readonly level: number;
  readonly name: string;
}
export interface CreateSkillInput {
  readonly link: string;
  readonly mastery: boolean;
  readonly name: string;
  readonly professionId: number;
  readonly rangeId: number;
  readonly userId: string;
}
export interface DeleteInput {
  readonly id: number;
}
export interface GetRangeBySlugInput {
  readonly slug: string;
}
export interface GetSkillsByRangeInput {
  readonly rangeId: number;
}

const persistenceQuery = <A>(
  operation: string,
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, SkillsPersistenceUnavailable> =>
  (self as Effect.Effect<A, unknown, never>).pipe(
    Effect.mapError(
      (cause) => new SkillsPersistenceUnavailable({ cause, operation })
    )
  );

const assertHttpUrl = (link: string) =>
  Effect.try({
    catch: () => new SkillsBadRequest({ message: "Podaj poprawny URL" }),
    try: () => new URL(link),
  }).pipe(
    Effect.flatMap((url) =>
      url.protocol === "http:" || url.protocol === "https:"
        ? Effect.void
        : Effect.fail(
            new SkillsBadRequest({
              message: "Link musi zaczynać się od http:// albo https://",
            })
          )
    )
  );

const createProfessionWithDatabase =
  (database: EffectPgDatabase) =>
  ({ name }: CreateProfessionInput) =>
    persistenceQuery(
      "createProfession",
      database.insert(professions).values({ name })
    );

const createRangeWithDatabase =
  (database: EffectPgDatabase) =>
  ({ image, level, name }: CreateRangeInput) =>
    Effect.gen(function* createRangeWithDatabase() {
      const slug = slugifySkillRangeName(name);
      if (slug === "") {
        return yield* new SkillsBadRequest({
          message: "Nazwa przedziału musi zawierać litery lub cyfry",
        });
      }
      const existing = yield* persistenceQuery(
        "findRangeBySlug",
        database
          .select({ id: range.id })
          .from(range)
          .where(eq(range.slug, slug))
          .limit(1)
      );
      if (existing[0]) {
        return yield* new SkillsConflict({
          message: "Przedział o tej nazwie już istnieje",
        });
      }
      yield* persistenceQuery(
        "createRange",
        database.insert(range).values({ image, level, name, slug })
      );
    });

const createSkillWithDatabase =
  (database: EffectPgDatabase) => (input: CreateSkillInput) =>
    Effect.gen(function* createSkillWithDatabase() {
      yield* assertHttpUrl(input.link);
      yield* persistenceQuery(
        "createSkill",
        database.insert(skills).values(input)
      );
    });

const deleteRangeWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id }: DeleteInput) =>
    persistenceQuery(
      "deleteRange",
      database.delete(range).where(eq(range.id, id))
    );
const deleteSkillWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id }: DeleteInput) =>
    persistenceQuery(
      "deleteSkill",
      database.delete(skills).where(eq(skills.id, id))
    );
const listProfessionsWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listProfessions", database.select().from(professions));
const listRangesWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listRanges", database.select().from(range));
const getRangeBySlugWithDatabase =
  (database: EffectPgDatabase) =>
  ({ slug }: GetRangeBySlugInput) =>
    Effect.gen(function* getRangeBySlugWithDatabase() {
      const rows = yield* persistenceQuery(
        "getRangeBySlug",
        database.select().from(range).where(eq(range.slug, slug)).limit(1)
      );
      return rows[0] ?? null;
    });
const listSkillsByRangeWithDatabase =
  (database: EffectPgDatabase) =>
  ({ rangeId }: GetSkillsByRangeInput) =>
    persistenceQuery(
      "listSkillsByRange",
      database
        .select({
          addedBy: user.name,
          addedByImage: user.image,
          id: skills.id,
          link: skills.link,
          mastery: skills.mastery,
          name: skills.name,
          professionId: professions.id,
          professionName: professions.name,
        })
        .from(skills)
        .innerJoin(professions, eq(professions.id, skills.professionId))
        .innerJoin(user, eq(user.id, skills.userId))
        .where(eq(skills.rangeId, rangeId))
    );

export class SkillsStore extends Context.Service<
  SkillsStore,
  {
    readonly createProfession: (
      input: CreateProfessionInput
    ) => Effect.Effect<void, SkillsPersistenceUnavailable>;
    readonly createRange: (
      input: CreateRangeInput
    ) => Effect.Effect<
      void,
      SkillsBadRequest | SkillsConflict | SkillsPersistenceUnavailable
    >;
    readonly createSkill: (
      input: CreateSkillInput
    ) => Effect.Effect<void, SkillsBadRequest | SkillsPersistenceUnavailable>;
    readonly deleteRange: (
      input: DeleteInput
    ) => Effect.Effect<void, SkillsPersistenceUnavailable>;
    readonly deleteSkill: (
      input: DeleteInput
    ) => Effect.Effect<void, SkillsPersistenceUnavailable>;
    readonly listProfessions: () => Effect.Effect<
      readonly (typeof professions.$inferSelect)[],
      SkillsPersistenceUnavailable
    >;
    readonly listRanges: () => Effect.Effect<
      readonly (typeof range.$inferSelect)[],
      SkillsPersistenceUnavailable
    >;
    readonly getRangeBySlug: (
      input: GetRangeBySlugInput
    ) => Effect.Effect<
      typeof range.$inferSelect | null,
      SkillsPersistenceUnavailable
    >;
    readonly listSkillsByRange: (input: GetSkillsByRangeInput) => Effect.Effect<
      readonly {
        readonly addedBy: string | null;
        readonly addedByImage: string | null;
        readonly id: number;
        readonly link: string;
        readonly mastery: boolean;
        readonly name: string;
        readonly professionId: number;
        readonly professionName: string;
      }[],
      SkillsPersistenceUnavailable
    >;
  }
>()("@tepirek-revamped/api/SkillsStore") {}

export const SkillsStoreLayer: Layer.Layer<SkillsStore, never, EffectDatabase> =
  Layer.effect(
    SkillsStore,
    EffectDatabase.useSync((database) =>
      SkillsStore.of({
        createProfession: Effect.fn("SkillsStore.createProfession")(
          createProfessionWithDatabase(database)
        ),
        createRange: Effect.fn("SkillsStore.createRange")(
          createRangeWithDatabase(database)
        ),
        createSkill: Effect.fn("SkillsStore.createSkill")(
          createSkillWithDatabase(database)
        ),
        deleteRange: Effect.fn("SkillsStore.deleteRange")(
          deleteRangeWithDatabase(database)
        ),
        deleteSkill: Effect.fn("SkillsStore.deleteSkill")(
          deleteSkillWithDatabase(database)
        ),
        getRangeBySlug: Effect.fn("SkillsStore.getRangeBySlug")(
          getRangeBySlugWithDatabase(database)
        ),
        listProfessions: Effect.fn("SkillsStore.listProfessions")(
          listProfessionsWithDatabase(database)
        ),
        listRanges: Effect.fn("SkillsStore.listRanges")(
          listRangesWithDatabase(database)
        ),
        listSkillsByRange: Effect.fn("SkillsStore.listSkillsByRange")(
          listSkillsByRangeWithDatabase(database)
        ),
      })
    )
  );
