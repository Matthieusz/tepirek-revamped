import { announcementRouter } from "./announcement";
import { auctionRouter } from "./auction";
import { betRouter } from "./bet";
import { eventRouter } from "./event";
import { heroesRouter } from "./heroes";
import { publicProcedure } from "./procedures";
import { rankingRouter } from "./ranking";
import { skillsRouter } from "./skills";
import { todoRouter } from "./todo";
import { userRouter } from "./user";
import { vaultRouter } from "./vault";

export const appRouter = {
  announcement: announcementRouter,
  auction: auctionRouter,
  bet: betRouter,
  event: eventRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  heroes: heroesRouter,
  ranking: rankingRouter,
  skills: skillsRouter,
  todo: todoRouter,
  user: userRouter,
  vault: vaultRouter,
};
export type AppRouter = typeof appRouter;
