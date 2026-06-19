import { db } from "@tepirek-revamped/db";
import { hero } from "@tepirek-revamped/db/schema/bet";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, verifiedProcedure } from "./procedures";

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
    .handler(({ input }) =>
      db.insert(hero).values({
        eventId: input.eventId,
        image: input.image ?? null,
        level: input.level,
        name: input.name,
      })
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(({ input }) => db.delete(hero).where(eq(hero.id, input.id))),

  getAll: verifiedProcedure.handler(() => db.select().from(hero)),

  getByEventId: verifiedProcedure
    .input(z.object({ eventId: z.number() }))
    .handler(({ input }) =>
      db.select().from(hero).where(eq(hero.eventId, input.eventId))
    ),
};
