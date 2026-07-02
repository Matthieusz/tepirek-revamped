import { announcementRouter } from "./announcement";
import { auctionRouter } from "./auction";
import { betRouter } from "./bet";
import { eventRouter } from "./event";
import { heroesRouter } from "./heroes";
import { publicProcedure } from "./procedures";
import { rankingRouter } from "./ranking";
import { skillsRouter } from "./skills";
import { createSquadBuilderRouter } from "./squad-builder";
import type { CreateSquadBuilderRouterOptions } from "./squad-builder";
import { todoRouter } from "./todo";
import { userRouter } from "./user";
import { vaultRouter } from "./vault";

export interface CreateAppRouterOptions {
  readonly squadBuilder?: CreateSquadBuilderRouterOptions;
}

export const createAppRouter = (options: CreateAppRouterOptions = {}) => ({
  announcement: announcementRouter,
  auction: auctionRouter,
  bet: betRouter,
  event: eventRouter,
  healthCheck: publicProcedure.handler(() => "OK"),
  heroes: heroesRouter,
  ranking: rankingRouter,
  skills: skillsRouter,
  squadBuilder: createSquadBuilderRouter(options.squadBuilder),
  todo: todoRouter,
  user: userRouter,
  vault: vaultRouter,
});

export const appRouter = createAppRouter();
export type AppRouter = ReturnType<typeof createAppRouter>;
