import { db } from "@tepirek-revamped/db";
import { announcement } from "@tepirek-revamped/db/schema/announcement";
import { user } from "@tepirek-revamped/db/schema/auth";
import { eq } from "drizzle-orm";
import z from "zod";
import { adminProcedure, protectedProcedure } from "../index";

export const announcementRouter = {
  getAll: protectedProcedure.handler(
    async () =>
      await db
        .select({
          id: announcement.id,
          title: announcement.title,
          description: announcement.description,
          createdAt: announcement.createdAt,
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
          },
        })
        .from(announcement)
        .leftJoin(user, eq(announcement.userId, user.id))
  ),

  create: adminProcedure
    .input(
      z.object({ title: z.string().min(1), description: z.string().min(1) })
    )
    .handler(
      async ({ input, context }) =>
        await db.insert(announcement).values({
          title: input.title,
          description: input.description,
          userId: context.session.user.id,
          createdAt: new Date(),
        })
    ),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(
      async ({ input }) =>
        await db.delete(announcement).where(eq(announcement.id, input.id))
    ),
};
