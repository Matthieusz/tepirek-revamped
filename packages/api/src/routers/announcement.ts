import { adminProcedure, protectedProcedure } from "@tepirek-revamped/api";
import { db } from "@tepirek-revamped/db";
import { announcement } from "@tepirek-revamped/db/schema/announcement";
import { user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const announcementRouter = {
  create: adminProcedure
    .input(
      z.object({ description: z.string().min(1), title: z.string().min(1) })
    )
    .handler(
      async ({ input, context }) =>
        await db.insert(announcement).values({
          createdAt: new Date(),
          description: input.description,
          title: input.title,
          userId: context.session.user.id,
        })
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input }) =>
        await db.delete(announcement).where(eq(announcement.id, input.id))
    ),

  getAll: protectedProcedure.handler(
    async () =>
      await db
        .select({
          createdAt: announcement.createdAt,
          description: announcement.description,
          id: announcement.id,
          title: announcement.title,
          user: {
            id: user.id,
            image: user.image,
            name: user.name,
          },
        })
        .from(announcement)
        .leftJoin(user, eq(announcement.userId, user.id))
  ),
};
