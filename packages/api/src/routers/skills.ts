import { adminProcedure, protectedProcedure } from "@tepirek-revamped/api";
import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import { professions, range, skills } from "@tepirek-revamped/db/schema/skills";
import { eq } from "drizzle-orm";
import { z } from "zod";

const toSlug = (name: string) =>
  name.trim().toLowerCase().replaceAll(/\s+/g, "-");

export const skillsRouter = {
  createProfession: adminProcedure
    .input(
      z.object({
        name: z.string().min(2),
      })
    )
    .handler(async ({ input }) =>
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
    .handler(async ({ input }) =>
      db.insert(range).values({
        image: input.image,
        level: input.level,
        name: input.name,
      })
    ),

  createSkill: protectedProcedure
    .input(
      z.object({
        link: z.string().min(1),
        mastery: z.boolean(),
        name: z.string().min(1),
        professionId: z.number(),
        rangeId: z.number(),
      })
    )
    .handler(async ({ input, context }) =>
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
    .handler(async ({ input }) =>
      db.delete(range).where(eq(range.id, input.id))
    ),

  deleteSkill: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) =>
      db.delete(skills).where(eq(skills.id, input.id))
    ),

  getAllProfessions: protectedProcedure.handler(async () =>
    db.select().from(professions)
  ),

  getAllRanges: protectedProcedure.handler(async () => db.select().from(range)),

  getRangeBySlug: protectedProcedure
    .input(
      z.object({
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      })
    )
    .handler(async ({ input }) => {
      const records = await db.select().from(range);
      for (const r of records) {
        if (toSlug(r.name) === input.slug) {
          return r;
        }
      }
      return null;
    }),

  getSkillsByRange: protectedProcedure
    .input(z.object({ rangeId: z.number() }))
    .handler(async ({ input }) =>
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
