import { betRouter } from "./bet.js";
import { rankingRouter } from "./ranking.js";
import { userRouter } from "./user.js";
import { vaultRouter } from "./vault.js";

export const createAppRouter = () => ({
  bet: betRouter,
  ranking: rankingRouter,
  user: userRouter,
  vault: vaultRouter,
});

export const appRouter = createAppRouter();
export type AppRouter = ReturnType<typeof createAppRouter>;
