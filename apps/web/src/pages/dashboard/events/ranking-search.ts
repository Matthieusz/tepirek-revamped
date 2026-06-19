import { z } from "zod";

const searchSchema = z.object({
  eventId: z.string().optional(),
  heroId: z.string().optional(),
  sortBy: z.enum(["points", "bets", "gold"]).optional(),
});

export { searchSchema };
