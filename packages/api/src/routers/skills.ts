import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import { professions, range, skills } from "@tepirek-revamped/db/schema/skills";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, verifiedProcedure } from "./procedures";

const skillLinkSchema = z.url("Podaj poprawny URL").refine((value) => {
  const { protocol } = new URL(value);
  return protocol === "http:" || protocol === "https:";
}, "Link musi zaczynać się od http:// albo https://");

export const skillsRouter = {
  createProfession: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
      })
    )
    .handler(({ input }) =>
      db.insert(professions).values({
        name: input.name,
      })
    ),

  createRange: adminProcedure
    .input(
      z.object({
        image: z.string().min(2),
        level: z.number().min(1).max(300),
        name: z.string().min(2),
      })
    )
    .handler(({ input }) =>
      db.insert(range).values({
        image: input.image,
        level: input.level,
        name: input.name,
      })
    ),

  createSkill: verifiedProcedure
    .input(
      z.object({
        link: skillLinkSchema,
        mastery: z.boolean(),
        name: z.string().min(1),
        professionId: z.number(),
        rangeId: z.number(),
      })
    )
    .handler(({ input, context }) =>
      db.insert(skills).values({
        link: input.link,
        mastery: input.mastery,
        name: input.name,
        professionId: input.professionId,
        rangeId: input.rangeId,
        userId: context.session.user.id,
      })
    ),

  deleteRange: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(({ input }) => db.delete(range).where(eq(range.id, input.id))),

  deleteSkill: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(({ input }) => db.delete(skills).where(eq(skills.id, input.id))),

  getAllProfessions: verifiedProcedure.handler(() =>
    db.select().from(professions)
  ),

  getAllRanges: verifiedProcedure.handler(() => db.select().from(range)),

  getRangeBySlug: verifiedProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
      })
    )
    .handler(async ({ input }) => {
      const [result] = await db
        .select()
        .from(range)
        .where(sql`lower(replace(${range.name}, ' ', '-')) = ${input.slug}`)
        .limit(1);
      return result ?? null;
    }),

  getSkillsByRange: verifiedProcedure
    .input(z.object({ rangeId: z.number() }))
    .handler(({ input }) =>
      db
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
        .where(eq(skills.rangeId, input.rangeId))
    ),
};
