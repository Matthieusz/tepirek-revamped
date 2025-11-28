import { protectedProcedure, publicProcedure } from "../index";
import { announcementRouter } from "./announcement";
import { auctionRouter } from "./auction";
import { betRouter } from "./bet";
import { eventRouter } from "./event";
import { heroesRouter } from "./heroes";
import { skillsRouter } from "./skills";
import { todoRouter } from "./todo";
import { userRouter } from "./user";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  todo: todoRouter,
  event: eventRouter,
  heroes: heroesRouter,
  skills: skillsRouter,
  user: userRouter,
  auction: auctionRouter,
  announcement: announcementRouter,
  bet: betRouter,
};
export type AppRouter = typeof appRouter;
