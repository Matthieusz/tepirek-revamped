import { z } from "zod";

import { heroBetLedger } from "../modules/hero-bet-ledger.js";
import { adminProcedure, verifiedProcedure } from "./procedures.js";

export const betRouter = {
  create: adminProcedure
    .input(
      z.object({
        heroId: z.number(),
        userIds: z.array(z.string()).min(1),
      })
    )
    .handler(({ input, context }) =>
      heroBetLedger.createBet({
        createdBy: context.session.user.id,
        heroId: input.heroId,
        userIds: input.userIds,
      })
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(({ input }) => heroBetLedger.deleteBet(input.id)),

  edit: adminProcedure
    .input(
      z.object({
        betId: z.number(),
        newUserIds: z.array(z.string()).min(1),
      })
    )
    .handler(({ input }) => heroBetLedger.editBet(input)),

  getAll: verifiedProcedure.handler(() => heroBetLedger.getAllBets()),

  getAllPaginated: verifiedProcedure
    .input(
      z.object({
        eventId: z.number().optional(),
        heroId: z.number().optional(),
        limit: z.number().int().positive().max(50).default(10),
        page: z.number().int().positive().default(1),
      })
    )
    .handler(({ input }) => heroBetLedger.getPaginatedBets(input)),

  getBetMembers: verifiedProcedure
    .input(z.object({ betId: z.number() }))
    .handler(({ input }) => heroBetLedger.getBetMembers(input.betId)),

  getByEvent: verifiedProcedure
    .input(z.object({ eventId: z.number() }))
    .handler(({ input }) => heroBetLedger.getBetsByEvent(input.eventId)),

  getLatestForCopy: verifiedProcedure.handler(() =>
    heroBetLedger.getLatestBetForCopy()
  ),
};
