import { db } from "@tepirek-revamped/db";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { and, eq } from "drizzle-orm";
import z from "zod";
import { protectedProcedure } from "../index";

export const todoRouter = {
  getAll: protectedProcedure.handler(
    async ({ context }) =>
      await db
        .select()
        .from(todo)
        .where(eq(todo.userId, context.session?.user.id))
  ),

  create: protectedProcedure
    .input(z.object({ text: z.string().min(1), userId: z.string() }))
    .handler(
      async ({ input, context }) =>
        await db.insert(todo).values({
          text: input.text,
          userId: context.session?.user.id,
        })
    ),

  toggle: protectedProcedure
    .input(z.object({ id: z.number(), completed: z.boolean() }))
    .handler(
      async ({ input, context }) =>
        await db
          .update(todo)
          .set({ completed: input.completed })
          .where(
            and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id))
          )
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input, context }) =>
        await db
          .delete(todo)
          .where(
            and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id))
          )
    ),
};
