import { db } from "@tepirek-revamped/db";
import { todo } from "@tepirek-revamped/db/schema/todo";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { verifiedProcedure } from "./procedures.js";

export const todoRouter = {
  create: verifiedProcedure
    .input(z.object({ text: z.string().min(1), userId: z.string() }))
    .handler(({ input, context }) =>
      db.insert(todo).values({
        text: input.text,
        userId: context.session?.user.id,
      })
    ),

  delete: verifiedProcedure
    .input(z.object({ id: z.number() }))
    .handler(({ input, context }) =>
      db
        .delete(todo)
        .where(
          and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id))
        )
    ),

  getAll: verifiedProcedure.handler(({ context }) =>
    db.select().from(todo).where(eq(todo.userId, context.session?.user.id))
  ),

  toggle: verifiedProcedure
    .input(z.object({ completed: z.boolean(), id: z.number() }))
    .handler(({ input, context }) =>
      db
        .update(todo)
        .set({ completed: input.completed })
        .where(
          and(eq(todo.id, input.id), eq(todo.userId, context.session.user.id))
        )
    ),
};
