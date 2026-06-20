import { z } from "zod";

import { heroBetLedger } from "../modules/hero-bet-ledger";
import { verifiedProcedure } from "./procedures";

export const rankingRouter = {
  getHeroStats: verifiedProcedure
    .input(z.object({ heroId: z.number() }))
    .handler(({ input }) => heroBetLedger.getHeroStats(input.heroId)),

  getOldestUnpaidEvent: verifiedProcedure.handler(() =>
    heroBetLedger.getOldestUnpaidEvent()
  ),

  getRanking: verifiedProcedure
    .input(
      z.object({
        eventId: z.number().optional(),
        heroId: z.number().optional(),
      })
    )
    .handler(({ input }) => heroBetLedger.getRanking(input)),
};
