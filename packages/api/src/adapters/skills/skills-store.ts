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
import * as Schema from "effect/Schema";

import {
  ProfessionId,
  SkillId,
  SkillRangeId,
} from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  SkillsBadRequest,
  SkillsConflict,
} from "../../protocol/skills/http-api-contract.ts";
import type {
  ProfessionSummary,
  RangeSummary,
  SkillSummary,
} from "../../protocol/skills/http-api-contract.ts";
import { makeDirectPersistenceQuery } from "../persistence-query.ts";
import { SkillsStoreError } from "./skills-store-error.ts";

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
  readonly professionId: typeof ProfessionId.Type;
  readonly rangeId: typeof SkillRangeId.Type;
  readonly userId: typeof AppUserId.Type;
}
export interface DeleteRangeInput {
  readonly id: typeof SkillRangeId.Type;
}
export interface DeleteSkillInput {
  readonly id: typeof SkillId.Type;
}
export interface GetRangeBySlugInput {
  readonly slug: string;
}
export interface GetSkillsByRangeInput {
  readonly rangeId: typeof SkillRangeId.Type;
}

const persistenceQuery = makeDirectPersistenceQuery(
  (input) => new SkillsStoreError(input)
);

const assertHttpUrl = (link: string) =>
  Schema.decodeUnknownEffect(Schema.URLFromString)(link).pipe(
    Effect.mapError(
      () => new SkillsBadRequest({ message: "Podaj poprawny URL" })
    ),
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

export const createProfessionWithDatabase =
  (database: EffectPgDatabase) =>
  ({ name }: CreateProfessionInput) =>
    persistenceQuery(
      "createProfession",
      database.insert(professions).values({ name })
    );

export const createRangeWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* createRangeWithDatabase({
    image,
    level,
    name,
  }: CreateRangeInput) {
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
    Effect.map((rows) =>
      rows.map((row) => ({ ...row, id: ProfessionId.make(row.id) }))
    )
  );
const listRangesWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listRanges", database.select().from(range)).pipe(
    Effect.map((rows) =>
      rows.map((row) => ({ ...row, id: SkillRangeId.make(row.id) }))
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
    return row === undefined ? null : { ...row, id: SkillRangeId.make(row.id) };
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
      Effect.map((rows) =>
        rows.map((row) => ({
          ...row,
          id: SkillId.make(row.id),
          professionId: ProfessionId.make(row.professionId),
        }))
      )
    );

export class SkillsStore extends Context.Service<
  SkillsStore,
  {
    readonly createProfession: (
      input: CreateProfessionInput
    ) => Effect.Effect<void, SkillsStoreError>;
    readonly createRange: (
      input: CreateRangeInput
    ) => Effect.Effect<
      void,
      SkillsBadRequest | SkillsConflict | SkillsStoreError
    >;
    readonly createSkill: (
      input: CreateSkillInput
    ) => Effect.Effect<void, SkillsBadRequest | SkillsStoreError>;
    readonly deleteRange: (
      input: DeleteRangeInput
    ) => Effect.Effect<void, SkillsStoreError>;
    readonly deleteSkill: (
      input: DeleteSkillInput
    ) => Effect.Effect<void, SkillsStoreError>;
    readonly listProfessions: () => Effect.Effect<
      readonly (typeof ProfessionSummary.Type)[],
      SkillsStoreError
    >;
    readonly listRanges: () => Effect.Effect<
      readonly (typeof RangeSummary.Type)[],
      SkillsStoreError
    >;
    readonly getRangeBySlug: (
      input: GetRangeBySlugInput
    ) => Effect.Effect<typeof RangeSummary.Type | null, SkillsStoreError>;
    readonly listSkillsByRange: (
      input: GetSkillsByRangeInput
    ) => Effect.Effect<readonly (typeof SkillSummary.Type)[], SkillsStoreError>;
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
