import { adminProcedure, protectedProcedure } from "@tepirek-revamped/api";
import { db } from "@tepirek-revamped/db";
import { hero } from "@tepirek-revamped/db/schema/bet";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const heroesRouter = {
  create: adminProcedure
    .input(
      z.object({
        eventId: z.number(),
        image: z.string().min(1).optional(),
        level: z.number().min(1).max(300).default(1),
        name: z.string().min(1),
      })
    )
    .handler(
      async ({ input }) =>
        await db.insert(hero).values({
          eventId: input.eventId,
          image: input.image || null,
          level: input.level,
          name: input.name,
        })
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input }) => await db.delete(hero).where(eq(hero.id, input.id))
    ),

  getAll: protectedProcedure.handler(async () => await db.select().from(hero)),

  getByEventId: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .handler(
      async ({ input }) =>
        await db.select().from(hero).where(eq(hero.eventId, input.eventId))
    ),
};
