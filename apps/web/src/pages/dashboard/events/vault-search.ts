import { z } from "zod";

const searchSchema = z.object({
  eventId: z.string().optional(),
});

export { searchSchema };
