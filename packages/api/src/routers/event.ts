import { db } from "@tepirek-revamped/db";
import { event } from "@tepirek-revamped/db/schema/event";
import { eq } from "drizzle-orm";
import z from "zod";
import { adminProcedure, protectedProcedure } from "../index";

export const eventRouter = {
  getAll: protectedProcedure.handler(async () => await db.select().from(event)),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        icon: z.string().min(1).default("calendar"),
        color: z.string().min(1).default("#6366f1"),
        endTime: z.iso.datetime(),
      })
    )
    .handler(
      async ({ input }) =>
        await db.insert(event).values({
          name: input.name,
          icon: input.icon,
          color: input.color,
          endTime: new Date(input.endTime),
        })
    ),

  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .handler(
      async ({ input }) =>
        await db
          .update(event)
          .set({ active: input.active })
          .where(eq(event.id, input.id))
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input }) => await db.delete(event).where(eq(event.id, input.id))
    ),
};
