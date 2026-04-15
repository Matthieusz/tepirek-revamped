import { ORPCError } from "@orpc/server";
import { adminProcedure, protectedProcedure } from "@tepirek-revamped/api";
import { POINTS_PER_HERO } from "@tepirek-revamped/config";
import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  hero,
  heroBet,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

export const betRouter = {
  create: adminProcedure
    .input(
      z.object({
        heroId: z.number(),
        userIds: z.array(z.string()).min(1),
      })
    )
    .handler(async ({ input, context }) => {
      const { heroId, userIds } = input;
      const memberCount = userIds.length;
      const pointsPerMember = (
        Math.floor((POINTS_PER_HERO / memberCount) * 100) / 100
      ).toFixed(2);

      // Get the hero to find the eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId })
        .from(hero)
        .where(eq(hero.id, heroId));

      if (!heroData) {
        throw new ORPCError("NOT_FOUND", {
          message: "Nie znaleziono herosów",
        });
      }

      // Create bet, members, and update stats in a transaction
      const newBet = await db.transaction(async (tx) => {
        // Create the bet
        const [bet] = await tx
          .insert(heroBet)
          .values({
            createdAt: new Date(),
            createdBy: context.session.user.id,
            heroId,
            memberCount,
          })
          .returning();

        if (!bet) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Nie udało się utworzyć obstawienia",
          });
        }

        // Create bet members
        await tx.insert(heroBetMember).values(
          userIds.map((userId) => ({
            heroBetId: bet.id,
            points: pointsPerMember,
            userId,
          }))
        );

        // Upsert userStats for each member
        await tx
          .insert(userStats)
          .values(
            userIds.map((userId) => ({
              bets: 1,
              earnings: "0",
              eventId: heroData.eventId,
              heroId,
              points: pointsPerMember,
              userId,
            }))
          )
          .onConflictDoUpdate({
            set: {
              bets: sql`${userStats.bets} + 1`,
              points: sql`${userStats.points} + ${pointsPerMember}`,
            },
            target: [userStats.userId, userStats.eventId, userStats.heroId],
          });

        return bet;
      });

      return newBet;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      // Get bet details before deletion to update stats
      const [betData] = await db
        .select({
          heroId: heroBet.heroId,
          memberCount: heroBet.memberCount,
        })
        .from(heroBet)
        .where(eq(heroBet.id, input.id));

      if (!betData) {
        throw new ORPCError("NOT_FOUND", {
          message: "Obstawienie nie znalezione",
        });
      }

      // Get hero to find eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId })
        .from(hero)
        .where(eq(hero.id, betData.heroId));

      if (!heroData) {
        throw new ORPCError("NOT_FOUND", {
          message: "Heros nie znaleziony",
        });
      }

      // Get bet members to decrement their stats
      const members = await db
        .select({ userId: heroBetMember.userId })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, input.id));

      const memberUserIds = [
        ...new Set(members.map((member) => member.userId)),
      ];

      // Decrement stats and delete bet in a transaction
      await db.transaction(async (tx) => {
        if (memberUserIds.length > 0) {
          await tx
            .update(userStats)
            .set({
              bets: sql`${userStats.bets} - 1`,
              points: sql`${userStats.points} - COALESCE((
                SELECT ${heroBetMember.points}
                FROM ${heroBetMember}
                WHERE ${heroBetMember.heroBetId} = ${input.id}
                  AND ${heroBetMember.userId} = ${userStats.userId}
                LIMIT 1
              ), 0)`,
            })
            .where(
              and(
                eq(userStats.eventId, heroData.eventId),
                eq(userStats.heroId, betData.heroId),
                inArray(userStats.userId, memberUserIds)
              )
            );
        }

        // Delete the bet (cascade will handle members)
        await tx.delete(heroBet).where(eq(heroBet.id, input.id));
      });

      return { success: true };
    }),

  edit: adminProcedure
    .input(
      z.object({
        betId: z.number(),
        newUserIds: z.array(z.string()).min(1),
      })
    )
    .handler(async ({ input }) => {
      const { betId, newUserIds } = input;
      const newMemberCount = newUserIds.length;

      // Get existing bet details
      const [betData] = await db
        .select({
          heroId: heroBet.heroId,
          memberCount: heroBet.memberCount,
        })
        .from(heroBet)
        .where(eq(heroBet.id, betId));

      if (!betData) {
        throw new ORPCError("NOT_FOUND", {
          message: "Obstawienie nie znalezione",
        });
      }

      // Get hero to find eventId
      const [heroData] = await db
        .select({ eventId: hero.eventId })
        .from(hero)
        .where(eq(hero.id, betData.heroId));

      if (!heroData) {
        throw new ORPCError("NOT_FOUND", {
          message: "Heros nie znaleziony",
        });
      }

      // Get current members with their points
      const currentMembers = await db
        .select({
          points: heroBetMember.points,
          userId: heroBetMember.userId,
        })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, betId));

      const currentMemberIds = new Set(currentMembers.map((m) => m.userId));

      if (currentMembers.length === 0) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Obstawienie nie ma członków",
        });
      }

      const oldPointsPerMember = Number.parseFloat(
        currentMembers[0]?.points ?? "0"
      );
      const newPointsPerMember = (
        Math.floor((POINTS_PER_HERO / newMemberCount) * 100) / 100
      ).toFixed(2);

      // Determine which members to add, remove, and keep
      const membersToRemove = currentMembers.filter(
        (m) => !newUserIds.includes(m.userId)
      );
      const membersToAdd = newUserIds.filter((id) => !currentMemberIds.has(id));
      const membersToKeep = currentMembers.filter((m) =>
        newUserIds.includes(m.userId)
      );

      // Perform updates in a transaction
      await db.transaction(async (tx) => {
        // 1. Remove deleted members from heroBetMember and decrement their stats
        if (membersToRemove.length > 0) {
          const removeUserIds = membersToRemove.map((m) => m.userId);

          // Decrement bets and subtract points for removed members
          await tx
            .update(userStats)
            .set({
              bets: sql`${userStats.bets} - 1`,
              points: sql`${userStats.points} - COALESCE((
                SELECT ${heroBetMember.points}
                FROM ${heroBetMember}
                WHERE ${heroBetMember.heroBetId} = ${betId}
                  AND ${heroBetMember.userId} = ${userStats.userId}
                LIMIT 1
              ), 0)`,
            })
            .where(
              and(
                eq(userStats.eventId, heroData.eventId),
                eq(userStats.heroId, betData.heroId),
                inArray(userStats.userId, removeUserIds)
              )
            );

          // Delete from heroBetMember
          await tx
            .delete(heroBetMember)
            .where(
              and(
                eq(heroBetMember.heroBetId, betId),
                inArray(heroBetMember.userId, removeUserIds)
              )
            );
        }

        // 2. Add new members to heroBetMember and increment their stats
        if (membersToAdd.length > 0) {
          await tx.insert(heroBetMember).values(
            membersToAdd.map((userId) => ({
              heroBetId: betId,
              points: newPointsPerMember,
              userId,
            }))
          );

          // Increment bets and add points for new members
          await tx
            .insert(userStats)
            .values(
              membersToAdd.map((userId) => ({
                bets: 1,
                earnings: "0",
                eventId: heroData.eventId,
                heroId: betData.heroId,
                points: newPointsPerMember,
                userId,
              }))
            )
            .onConflictDoUpdate({
              set: {
                bets: sql`${userStats.bets} + 1`,
                points: sql`${userStats.points} + ${newPointsPerMember}`,
              },
              target: [userStats.userId, userStats.eventId, userStats.heroId],
            });
        }

        // 3. Update existing members' points in heroBetMember and userStats
        if (membersToKeep.length > 0) {
          const keepUserIds = membersToKeep.map((m) => m.userId);
          const pointsDiff = Number(newPointsPerMember) - oldPointsPerMember;

          // Update heroBetMember points
          await tx
            .update(heroBetMember)
            .set({ points: newPointsPerMember })
            .where(
              and(
                eq(heroBetMember.heroBetId, betId),
                inArray(heroBetMember.userId, keepUserIds)
              )
            );

          // Update userStats points (add the difference)
          if (pointsDiff !== 0) {
            await tx
              .update(userStats)
              .set({
                points: sql`${userStats.points} + ${pointsDiff.toFixed(2)}`,
              })
              .where(
                and(
                  eq(userStats.eventId, heroData.eventId),
                  eq(userStats.heroId, betData.heroId),
                  inArray(userStats.userId, keepUserIds)
                )
              );
          }
        }

        // 4. Update heroBet.memberCount
        await tx
          .update(heroBet)
          .set({ memberCount: newMemberCount })
          .where(eq(heroBet.id, betId));
      });

      return { success: true };
    }),

  getAll: protectedProcedure.handler(async () => {
    const bets = await db
      .select({
        createdAt: heroBet.createdAt,
        createdBy: heroBet.createdBy,
        createdByImage: user.image,
        createdByName: user.name,
        eventId: hero.eventId,
        heroId: heroBet.heroId,
        heroImage: hero.image,
        heroName: hero.name,
        id: heroBet.id,
        memberCount: heroBet.memberCount,
      })
      .from(heroBet)
      .innerJoin(hero, eq(heroBet.heroId, hero.id))
      .innerJoin(user, eq(heroBet.createdBy, user.id))
      .orderBy(desc(heroBet.createdAt));

    // Batch fetch all members in single query (avoid N+1)
    const betIds = bets.map((bet) => bet.id);
    const allMembers =
      betIds.length > 0
        ? await db
            .select({
              heroBetId: heroBetMember.heroBetId,
              points: heroBetMember.points,
              userId: heroBetMember.userId,
              userImage: user.image,
              userName: user.name,
            })
            .from(heroBetMember)
            .innerJoin(user, eq(heroBetMember.userId, user.id))
            .where(inArray(heroBetMember.heroBetId, betIds))
        : [];

    // Group members by bet ID
    const membersByBetId = new Map<number, (typeof allMembers)[number][]>();
    for (const member of allMembers) {
      const existing = membersByBetId.get(member.heroBetId) ?? [];
      existing.push(member);
      membersByBetId.set(member.heroBetId, existing);
    }

    // Combine bets with their members
    return bets.map((bet) => ({
      ...bet,
      members: membersByBetId.get(bet.id) ?? [],
    }));
  }),

  getAllPaginated: protectedProcedure
    .input(
      z.object({
        eventId: z.number().optional(),
        heroId: z.number().optional(),
        limit: z.number().int().positive().max(50).default(10),
        page: z.number().int().positive().default(1),
      })
    )
    .handler(async ({ input }) => {
      const { page, limit, eventId, heroId } = input;
      const offset = (page - 1) * limit;

      // Build where conditions
      const conditions: SQL[] = [];
      if (eventId !== undefined) {
        conditions.push(eq(hero.eventId, eventId));
      }
      if (heroId !== undefined) {
        conditions.push(eq(heroBet.heroId, heroId));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get paginated bets
      const bets = await db
        .select({
          createdAt: heroBet.createdAt,
          createdBy: heroBet.createdBy,
          createdByImage: user.image,
          createdByName: user.name,
          eventId: hero.eventId,
          heroId: heroBet.heroId,
          heroImage: hero.image,
          heroLevel: hero.level,
          heroName: hero.name,
          id: heroBet.id,
          memberCount: heroBet.memberCount,
        })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .innerJoin(user, eq(heroBet.createdBy, user.id))
        .where(whereClause)
        .orderBy(desc(heroBet.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .where(whereClause);

      const totalItems = Number(countResult?.count ?? 0);
      const totalPages = Math.ceil(totalItems / limit);

      // Batch fetch members for all bets in this page
      const betIds = bets.map((bet) => bet.id);
      const allMembers =
        betIds.length > 0
          ? await db
              .select({
                heroBetId: heroBetMember.heroBetId,
                points: heroBetMember.points,
                userId: heroBetMember.userId,
                userImage: user.image,
                userName: user.name,
              })
              .from(heroBetMember)
              .innerJoin(user, eq(heroBetMember.userId, user.id))
              .where(inArray(heroBetMember.heroBetId, betIds))
          : [];

      // Group members by bet ID
      const membersByBetId = new Map<number, (typeof allMembers)[number][]>();
      for (const member of allMembers) {
        const existing = membersByBetId.get(member.heroBetId) ?? [];
        existing.push(member);
        membersByBetId.set(member.heroBetId, existing);
      }

      // Combine bets with their members
      const betsWithMembers = bets.map((bet) => ({
        ...bet,
        members: membersByBetId.get(bet.id) ?? [],
      }));

      return {
        items: betsWithMembers,
        pagination: {
          hasMore: page < totalPages,
          limit,
          page,
          totalItems,
          totalPages,
        },
      };
    }),

  getBetMembers: protectedProcedure
    .input(z.object({ betId: z.number() }))
    .handler(async ({ input }) => {
      const members = await db
        .select({
          id: heroBetMember.id,
          points: heroBetMember.points,
          userId: heroBetMember.userId,
        })
        .from(heroBetMember)
        .where(eq(heroBetMember.heroBetId, input.betId));

      return members;
    }),

  getByEvent: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .handler(async ({ input }) => {
      const bets = await db
        .select({
          createdAt: heroBet.createdAt,
          createdBy: heroBet.createdBy,
          eventId: hero.eventId,
          heroId: heroBet.heroId,
          heroName: hero.name,
          id: heroBet.id,
          memberCount: heroBet.memberCount,
        })
        .from(heroBet)
        .innerJoin(hero, eq(heroBet.heroId, hero.id))
        .where(eq(hero.eventId, input.eventId));

      return bets;
    }),
};
