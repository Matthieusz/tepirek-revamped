/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import { slugifySkillRangeName } from "@tepirek-revamped/config";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { user } from "@tepirek-revamped/db/schema/auth";
import { professions, range, skills } from "@tepirek-revamped/db/schema/skills";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import {
  ProfessionId,
  SkillId,
  SkillRangeId,
} from "../../domain/core-identifiers.ts";
import {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationInvalidInput,
} from "../../services/application-errors.ts";
import { SkillsStore } from "../../services/skills/skills-store.ts";
import type {
  CreateProfessionInput,
  CreateRangeInput,
  CreateSkillInput,
  DeleteRangeInput,
  DeleteSkillInput,
  GetRangeBySlugInput,
  GetSkillsByRangeInput,
} from "../../services/skills/skills-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new ApplicationDependencyUnavailable(input)
);
const decodePersisted = <A>(
  schema: Schema.ConstraintDecoder<A>,
  operation: string
) =>
  decodePersistedValue(
    schema,
    operation,
    // oxlint-disable-next-line promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
    (error) => new ApplicationDependencyUnavailable(error)
  );

const assertHttpUrl = (link: string) =>
  Schema.decodeEffect(Schema.URLFromString)(link).pipe(
    Effect.mapError(
      () => new ApplicationInvalidInput({ message: "Podaj poprawny URL" })
    ),
    Effect.flatMap((url) =>
      url.protocol === "http:" || url.protocol === "https:"
        ? Effect.void
        : Effect.fail(
            new ApplicationInvalidInput({
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

const createRangeWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createRangeWithDatabase({
    image,
    level,
    name,
  }: CreateRangeInput) {
    const slug = slugifySkillRangeName(name);
    if (slug === "") {
      return yield* new ApplicationInvalidInput({
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
      return yield* new ApplicationConflict({
        message: "Przedział o tej nazwie już istnieje",
      });
    }
    yield* persistenceQuery(
      "createRange",
      database.insert(range).values({ image, level, name, slug })
    );
    return yield* Effect.void;
  });

const createSkillWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createSkillWithDatabase(input: CreateSkillInput) {
    yield* assertHttpUrl(input.link);
    yield* persistenceQuery(
      "createSkill",
      database.insert(skills).values(input)
    );
  });

const deleteRangeWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id }: DeleteRangeInput) =>
    persistenceQuery(
      "deleteRange",
      database.delete(range).where(eq(range.id, id))
    );
const deleteSkillWithDatabase =
  (database: EffectPgDatabase) =>
  ({ id }: DeleteSkillInput) =>
    persistenceQuery(
      "deleteSkill",
      database.delete(skills).where(eq(skills.id, id))
    );
const listProfessionsWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listProfessions", database.select().from(professions)).pipe(
    Effect.flatMap((rows) =>
      Effect.all(
        rows.map((row) =>
          decodePersisted(
            ProfessionId,
            "listProfessions.decode"
          )(row.id).pipe(Effect.map((id) => ({ ...row, id })))
        )
      )
    )
  );
const listRangesWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listRanges", database.select().from(range)).pipe(
    Effect.flatMap((rows) =>
      Effect.all(
        rows.map((row) =>
          decodePersisted(
            SkillRangeId,
            "listRanges.decode"
          )(row.id).pipe(Effect.map((id) => ({ ...row, id })))
        )
      )
    )
  );
const getRangeBySlugWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getRangeBySlugWithDatabase({
    slug,
  }: GetRangeBySlugInput) {
    const rows = yield* persistenceQuery(
      "getRangeBySlug",
      database.select().from(range).where(eq(range.slug, slug)).limit(1)
    );
    const [row] = rows;
    if (row === undefined) {
      return null;
    }
    const id = yield* decodePersisted(
      SkillRangeId,
      "getRangeBySlug.decode"
    )(row.id);
    return { ...row, id };
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
    ).pipe(
      Effect.flatMap((rows) =>
        Effect.all(
          rows.map((row) =>
            Effect.gen(function* decodeSkillRow() {
              const id = yield* decodePersisted(
                SkillId,
                "listSkillsByRange.decode"
              )(row.id);
              const professionId = yield* decodePersisted(
                ProfessionId,
                "listSkillsByRange.decode"
              )(row.professionId);
              return { ...row, id, professionId };
            })
          )
        )
      )
    );

const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const SkillsStoreLayer: Layer.Layer<SkillsStore, never, EffectDatabase> =
  Layer.effect(
    SkillsStore,
    getDatabaseSync((database) =>
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
