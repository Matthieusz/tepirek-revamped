import { z } from "zod";

import { heroBetLedger } from "../modules/hero-bet-ledger";
import { adminProcedure, verifiedProcedure } from "./procedures";

export const vaultRouter = {
  distributeGold: adminProcedure
    .input(z.object({ goldAmount: z.number().positive(), heroId: z.number() }))
    .handler(({ input }) => heroBetLedger.distributeGold(input)),

  getUserStats: verifiedProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .handler(({ input }) => heroBetLedger.getUserStats(input.eventId)),

  getVault: verifiedProcedure
    .input(z.object({ eventId: z.number().optional() }))
    .handler(({ input }) => heroBetLedger.getVault(input.eventId)),

  togglePaidOut: adminProcedure
    .input(
      z.object({
        eventId: z.number().optional(),
        paidOut: z.boolean(),
        userId: z.string(),
      })
    )
    .handler(({ input }) => heroBetLedger.togglePaidOut(input)),
};
