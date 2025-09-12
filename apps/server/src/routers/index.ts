import { protectedProcedure, publicProcedure } from "../lib/orpc";
import { announcementRouter } from "./announcement";
import { auctionRouter } from "./auction";
import { eventRouter } from "./event";
import { heroesRouter } from "./heroes";
import { skillsRouter } from "./skills";
import { todoRouter } from "./todo";
import { userRouter } from "./user";

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
	heroes: heroesRouter,
	skills: skillsRouter,
	user: userRouter,
	auction: auctionRouter,
	announcement: announcementRouter,
};
export type AppRouter = typeof appRouter;
