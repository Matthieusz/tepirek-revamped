import { announcementRouter } from "./announcement.js";
import { auctionRouter } from "./auction.js";
import { betRouter } from "./bet.js";
import { eventRouter } from "./event.js";
import { heroesRouter } from "./heroes.js";
import { publicProcedure } from "./procedures.js";
import { rankingRouter } from "./ranking.js";
import { skillsRouter } from "./skills.js";
import { createSquadBuilderRouter } from "./squad-builder.js";
import type { CreateSquadBuilderRouterOptions } from "./squad-builder.js";
import { todoRouter } from "./todo.js";
import { userRouter } from "./user.js";
import { vaultRouter } from "./vault.js";

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
