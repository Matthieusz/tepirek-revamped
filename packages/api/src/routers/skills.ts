import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import { professions, range, skills } from "@tepirek-revamped/db/schema/skills";
import { eq } from "drizzle-orm";
import z from "zod";
import { adminProcedure, protectedProcedure } from "../index";

export const skillsRouter = {
  getAllRanges: protectedProcedure.handler(
    async () => await db.select().from(range)
  ),

  getAllProfessions: protectedProcedure.handler(
    async () => await db.select().from(professions)
  ),

  getSkillsByRange: protectedProcedure
    .input(z.object({ rangeId: z.number() }))
    .handler(
      async ({ input }) =>
        await db
          .select({
            id: skills.id,
            name: skills.name,
            link: skills.link,
            mastery: skills.mastery,
            professionId: professions.id,
            professionName: professions.name,
            addedBy: user.name,
            addedByImage: user.image,
          })
          .from(skills)
          .innerJoin(professions, eq(professions.id, skills.professionId))
          .innerJoin(user, eq(user.id, skills.userId))
          .where(eq(skills.rangeId, input.rangeId))
    ),

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
      const toSlug = (name: string) =>
        name.trim().toLowerCase().replace(/\s+/g, "-");
      for (const r of records) {
        if (toSlug(r.name) === input.slug) {
          return r;
        }
      }
      return null;
    }),

  createRange: adminProcedure
    .input(
      z.object({
        level: z.number().min(1).max(300),
        image: z.string().min(2),
        name: z.string().min(2),
      })
    )
    .handler(
      async ({ input }) =>
        await db.insert(range).values({
          level: input.level,
          image: input.image,
          name: input.name,
        })
    ),

  deleteRange: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input }) => await db.delete(range).where(eq(range.id, input.id))
    ),

  createSkill: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        link: z.string().min(1),
        mastery: z.boolean(),
        professionId: z.number(),
        rangeId: z.number(),
      })
    )
    .handler(
      async ({ input, context }) =>
        await db.insert(skills).values({
          name: input.name,
          link: input.link,
          mastery: input.mastery,
          professionId: input.professionId,
          rangeId: input.rangeId,
          userId: context.session.user.id,
        })
    ),

  deleteSkill: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input }) =>
        await db.delete(skills).where(eq(skills.id, input.id))
    ),
};
