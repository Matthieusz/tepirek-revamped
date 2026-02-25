import { adminProcedure, protectedProcedure } from "@tepirek-revamped/api";
import { db } from "@tepirek-revamped/db";
import { event } from "@tepirek-revamped/db/schema/event";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const eventRouter = {
  create: adminProcedure
    .input(
      z.object({
        color: z.string().min(1).default("#6366f1"),
        endTime: z.iso.datetime(),
        icon: z.string().min(1).default("calendar"),
        name: z.string().min(1),
      })
    )
    .handler(async ({ input }) =>
      db.insert(event).values({
        color: input.color,
        endTime: new Date(input.endTime),
        icon: input.icon,
        name: input.name,
      })
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) =>
      db.delete(event).where(eq(event.id, input.id))
    ),

  getAll: protectedProcedure.handler(async () => db.select().from(event)),

  toggleActive: adminProcedure
    .input(z.object({ active: z.boolean(), id: z.number() }))
    .handler(async ({ input }) =>
      db
        .update(event)
        .set({ active: input.active })
        .where(eq(event.id, input.id))
    ),
};
