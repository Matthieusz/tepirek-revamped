import { protectedProcedure, publicProcedure } from "../index";
import { announcementRouter } from "./announcement";
import { auctionRouter } from "./auction";
import { betRouter } from "./bet";
import { eventRouter } from "./event";
import { heroesRouter } from "./heroes";
import { skillsRouter } from "./skills";
import { squadRouter } from "./squad";
import { todoRouter } from "./todo";
import { userRouter } from "./user";

export const appRouter = {
  announcement: announcementRouter,
  auction: auctionRouter,
  bet: betRouter,
  event: eventRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  heroes: heroesRouter,
  privateData: protectedProcedure.handler(({ context }) => ({
    message: "This is private",
    user: context.session?.user,
  })),
  skills: skillsRouter,
  squad: squadRouter,
  todo: todoRouter,
  user: userRouter,
};
export type AppRouter = typeof appRouter;
