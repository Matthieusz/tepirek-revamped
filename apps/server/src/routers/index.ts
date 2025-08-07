import { protectedProcedure, publicProcedure } from "../lib/orpc";
import { eventRouter } from "./event";
import { todoRouter } from "./todo";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	todo: todoRouter,
	event: eventRouter,
};
export type AppRouter = typeof appRouter;
