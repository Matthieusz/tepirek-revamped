import { db } from "@tepirek-revamped/db";
import { event } from "@tepirek-revamped/db/schema/event";
import { eq } from "drizzle-orm";
import z from "zod";
import { protectedProcedure } from "../index";

export const eventRouter = {
  getAll: protectedProcedure.handler(async () => await db.select().from(event)),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), endTime: z.iso.datetime() }))
    .handler(
      async ({ input }) =>
        await db.insert(event).values({
          name: input.name,
          endTime: new Date(input.endTime),
        })
    ),

  toggleActive: protectedProcedure
    .input(z.object({ id: z.number(), active: z.boolean() }))
    .handler(
      async ({ input }) =>
        await db
          .update(event)
          .set({ active: input.active })
          .where(eq(event.id, input.id))
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input }) => await db.delete(event).where(eq(event.id, input.id))
    ),
};
