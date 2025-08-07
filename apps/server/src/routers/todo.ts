import { eq } from "drizzle-orm";
import z from "zod";
import { db } from "../db";
import { todo } from "../db/schema/todo";
import { protectedProcedure } from "../lib/orpc";

export const todoRouter = {
	getAll: protectedProcedure.handler(async ({ context }) => {
		return await db
			.select()
			.from(todo)
			.where(eq(todo.userId, context.session?.user.id));
	}),

	create: protectedProcedure
		.input(z.object({ text: z.string().min(1), userId: z.string() }))
		.handler(async ({ input, context }) => {
			return await db.insert(todo).values({
				text: input.text,
				userId: context.session?.user.id,
			});
		}),

	toggle: protectedProcedure
		.input(z.object({ id: z.number(), completed: z.boolean() }))
		.handler(async ({ input }) => {
			return await db
				.update(todo)
				.set({ completed: input.completed })
				.where(eq(todo.id, input.id));
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.number() }))
		.handler(async ({ input }) => {
			return await db.delete(todo).where(eq(todo.id, input.id));
		}),
};
