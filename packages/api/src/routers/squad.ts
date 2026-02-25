import { ORPCError } from "@orpc/server";
import { protectedProcedure } from "@tepirek-revamped/api";
import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  character,
  gameAccount,
  gameAccountShare,
  squad,
  squadMember,
  squadShare,
} from "@tepirek-revamped/db/schema/squad";
import { and, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { z } from "zod";

// Schema do parsowania postaci z HTML
const parsedCharacterSchema = z.object({
  avatarUrl: z.string().optional(),
  externalId: z.number(),
  gender: z.string().optional(),
  guildId: z.number().optional(),
  guildName: z.string().optional(),
  level: z.number(),
  nick: z.string(),
  profession: z.string(),
  professionName: z.string(),
  world: z.string(),
});

const createGameAccountSchema = z.object({
  accountLevel: z.number().optional(),
  characters: z.array(parsedCharacterSchema),
  name: z.string().min(1),
  profileUrl: z.string().optional(),
});

const createSquadSchema = z.object({
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  memberIds: z.array(z.number()).max(10),
  name: z.string().min(1).max(100),
  world: z.string().min(1),
});

const shareSquadSchema = z.object({
  squadId: z.number(),
  userId: z.string().min(1),
});

const shareGameAccountSchema = z.object({
  accountId: z.number(),
  userId: z.string().min(1),
});

const updateSquadSchema = z.object({
  description: z.string().max(500).optional(),
  id: z.number(),
  isPublic: z.boolean(),
  memberIds: z.array(z.number()).max(10),
  name: z.string().min(1).max(100),
});

// TypeScript requires function declarations for assertion signatures (TS2775)
// oxlint-disable-next-line func-style
function assertUserId(userId: string | undefined): asserts userId is string {
  if (!userId) {
    throw new ORPCError("UNAUTHORIZED");
  }
}

export const squadRouter = {
  createGameAccount: protectedProcedure
    .input(createGameAccountSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const existing = await db
        .select()
        .from(gameAccount)
        .where(
          and(eq(gameAccount.userId, userId), eq(gameAccount.name, input.name))
        )
        .limit(1);

      if (existing.length > 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Konto o tej nazwie już istnieje",
        });
      }

      const [newAccount] = await db
        .insert(gameAccount)
        .values({
          accountLevel: input.accountLevel,
          name: input.name,
          profileUrl: input.profileUrl,
          userId,
        })
        .returning();

      if (input.characters.length > 0 && newAccount) {
        const characterValues = input.characters.map((char) => ({
          avatarUrl: char.avatarUrl,
          externalId: char.externalId,
          gameAccountId: newAccount.id,
          gender: char.gender,
          guildId: char.guildId || null,
          guildName: char.guildName || null,
          level: char.level,
          nick: char.nick,
          profession: char.profession,
          professionName: char.professionName,
          world: char.world.toLowerCase(),
        }));

        await db.insert(character).values(characterValues);
      }

      return newAccount;
    }),

  createSquad: protectedProcedure
    .input(createSquadSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      if (input.memberIds.length > 0) {
        const characters = await db
          .select({
            id: character.id,
            world: character.world,
          })
          .from(character)
          .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
          .where(
            and(
              inArray(character.id, input.memberIds),
              or(
                eq(gameAccount.userId, userId),
                sql`EXISTS (
                  SELECT 1 FROM game_account_share gas
                  WHERE gas.game_account_id = ${gameAccount.id}
                    AND gas.shared_with_user_id = ${userId}
                )`
              )
            )
          );

        if (characters.length !== input.memberIds.length) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Niektóre postacie nie istnieją lub nie należą do Ciebie",
          });
        }

        const wrongWorld = characters.filter(
          (c) => c.world.toLowerCase() !== input.world.toLowerCase()
        );
        if (wrongWorld.length > 0) {
          throw new ORPCError("BAD_REQUEST", {
            message:
              "Wszystkie postacie muszą być z tego samego świata co squad",
          });
        }
      }

      const newSquad = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(squad)
          .values({
            description: input.description,
            isPublic: input.isPublic,
            name: input.name,
            userId,
            world: input.world.toLowerCase(),
          })
          .returning();

        if (input.memberIds.length > 0 && created) {
          const memberValues = input.memberIds.map((charId, idx) => ({
            characterId: charId,
            position: idx + 1,
            squadId: created.id,
          }));

          await tx.insert(squadMember).values(memberValues);
        }

        return created;
      });

      return newSquad;
    }),

  deleteCharacter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      // Verify ownership through gameAccount
      const char = await db
        .select({ gameAccountUserId: gameAccount.userId })
        .from(character)
        .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
        .where(eq(character.id, input.id))
        .limit(1);

      if (char.length === 0 || char[0]?.gameAccountUserId !== userId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Postać nie istnieje lub nie masz do niej dostępu",
        });
      }

      await db.delete(character).where(eq(character.id, input.id));

      return { success: true };
    }),

  deleteGameAccount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      await db
        .delete(gameAccount)
        .where(
          and(eq(gameAccount.id, input.id), eq(gameAccount.userId, userId))
        );

      return { success: true };
    }),

  deleteSquad: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      await db
        .delete(squad)
        .where(and(eq(squad.id, input.id), eq(squad.userId, userId)));

      return { success: true };
    }),

  getAvailableWorlds: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    assertUserId(userId);

    const worlds = await db
      .selectDistinct({ world: character.world })
      .from(character)
      .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
      .where(
        or(
          eq(gameAccount.userId, userId),
          sql`EXISTS (
            SELECT 1 FROM game_account_share gas
            WHERE gas.game_account_id = ${gameAccount.id}
              AND gas.shared_with_user_id = ${userId}
          )`
        )
      );

    return worlds.map((w) => w.world);
  }),

  getGameAccountShares: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const account = await db
        .select({ userId: gameAccount.userId })
        .from(gameAccount)
        .where(eq(gameAccount.id, input.accountId))
        .limit(1);

      if (account.length === 0 || account[0]?.userId !== userId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Nie masz dostępu do tego konta",
        });
      }

      return await db
        .select({
          canManage: gameAccountShare.canManage,
          id: gameAccountShare.id,
          userEmail: user.email,
          userId: user.id,
          userImage: user.image,
          userName: user.name,
        })
        .from(gameAccountShare)
        .innerJoin(user, eq(gameAccountShare.sharedWithUserId, user.id))
        .where(eq(gameAccountShare.gameAccountId, input.accountId));
    }),

  getMyCharacters: protectedProcedure
    .input(
      z
        .object({
          excludeInSquad: z.boolean().optional(),
          excludeInSquadExceptSquadId: z.number().optional(),
          gameAccountId: z.number().optional(),
          maxLevel: z.number().int().min(1).optional(),
          minLevel: z.number().int().min(1).optional(),
          world: z.string().optional(),
        })
        .refine(
          (val) =>
            val.minLevel === undefined ||
            val.maxLevel === undefined ||
            val.minLevel <= val.maxLevel,
          {
            message: "minLevel nie może być większy niż maxLevel",
          }
        )
        .optional()
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const conditions = [
        sql`(${gameAccount.userId} = ${userId} OR EXISTS (
          SELECT 1 FROM game_account_share gas
          WHERE gas.game_account_id = ${gameAccount.id}
            AND gas.shared_with_user_id = ${userId}
        ))`,
      ];

      if (input?.world) {
        conditions.push(eq(character.world, input.world.toLowerCase()));
      }

      if (input?.gameAccountId) {
        conditions.push(eq(character.gameAccountId, input.gameAccountId));
      }

      if (input?.minLevel !== undefined) {
        conditions.push(gte(character.level, input.minLevel));
      }

      if (input?.maxLevel !== undefined) {
        conditions.push(lte(character.level, input.maxLevel));
      }

      if (input?.excludeInSquad) {
        const exceptSquadId = input.excludeInSquadExceptSquadId ?? -1;
        conditions.push(sql`NOT EXISTS (
          SELECT 1
          FROM squad_member sm
          JOIN squad s ON sm.squad_id = s.id
          WHERE sm.character_id = ${character.id}
            AND sm.squad_id <> ${exceptSquadId}
            AND (
              s.user_id = ${userId}
              OR EXISTS (
                SELECT 1 FROM squad_share ss
                WHERE ss.squad_id = s.id
                  AND ss.shared_with_user_id = ${userId}
              )
            )
        )`);
      }

      return await db
        .select({
          avatarUrl: character.avatarUrl,
          externalId: character.externalId,
          gameAccountId: character.gameAccountId,
          gameAccountName: gameAccount.name,
          gender: character.gender,
          guildId: character.guildId,
          guildName: character.guildName,
          id: character.id,
          level: character.level,
          nick: character.nick,
          profession: character.profession,
          professionName: character.professionName,
          world: character.world,
        })
        .from(character)
        .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
        .where(and(...conditions))
        .orderBy(character.level);
    }),

  getMyGameAccounts: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    assertUserId(userId);

    const owned = await db
      .select({
        accountLevel: gameAccount.accountLevel,
        canManage: sql<boolean>`true`.as("can_manage"),
        createdAt: gameAccount.createdAt,
        id: gameAccount.id,
        isOwner: sql<boolean>`true`.as("is_owner"),
        name: gameAccount.name,
        ownerName: user.name,
        profileUrl: gameAccount.profileUrl,
        updatedAt: gameAccount.updatedAt,
        userId: gameAccount.userId,
      })
      .from(gameAccount)
      .innerJoin(user, eq(gameAccount.userId, user.id))
      .where(eq(gameAccount.userId, userId));

    const shared = await db
      .select({
        accountLevel: gameAccount.accountLevel,
        canManage: gameAccountShare.canManage,
        createdAt: gameAccount.createdAt,
        id: gameAccount.id,
        isOwner: sql<boolean>`false`.as("is_owner"),
        name: gameAccount.name,
        ownerName: user.name,
        profileUrl: gameAccount.profileUrl,
        updatedAt: gameAccount.updatedAt,
        userId: gameAccount.userId,
      })
      .from(gameAccountShare)
      .innerJoin(
        gameAccount,
        eq(gameAccountShare.gameAccountId, gameAccount.id)
      )
      .innerJoin(user, eq(gameAccount.userId, user.id))
      .where(eq(gameAccountShare.sharedWithUserId, userId));

    return [...owned, ...shared].toSorted((a, b) =>
      a.name.localeCompare(b.name)
    );
  }),

  getMySquads: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    assertUserId(userId);

    const ownedSquads = await db
      .select({
        canEdit: sql<boolean>`true`.as("can_edit"),
        createdAt: squad.createdAt,
        description: squad.description,
        id: squad.id,
        isOwner: sql<boolean>`true`.as("is_owner"),
        isPublic: squad.isPublic,
        name: squad.name,
        ownerName: user.name,
        updatedAt: squad.updatedAt,
        world: squad.world,
      })
      .from(squad)
      .innerJoin(user, eq(squad.userId, user.id))
      .where(eq(squad.userId, userId));

    const sharedSquads = await db
      .select({
        canEdit: squadShare.canEdit,
        createdAt: squad.createdAt,
        description: squad.description,
        id: squad.id,
        isOwner: sql<boolean>`false`.as("is_owner"),
        isPublic: squad.isPublic,
        name: squad.name,
        ownerName: user.name,
        updatedAt: squad.updatedAt,
        world: squad.world,
      })
      .from(squadShare)
      .innerJoin(squad, eq(squadShare.squadId, squad.id))
      .innerJoin(user, eq(squad.userId, user.id))
      .where(eq(squadShare.sharedWithUserId, userId));

    return [...ownedSquads, ...sharedSquads];
  }),

  getSquadDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const hasAccess = await db
        .select()
        .from(squad)
        .where(
          and(
            eq(squad.id, input.id),
            sql`(${squad.userId} = ${userId} OR ${squad.isPublic} = true OR EXISTS (SELECT 1 FROM squad_share WHERE squad_share.squad_id = ${input.id} AND squad_share.shared_with_user_id = ${userId}))`
          )
        )
        .limit(1);

      if (hasAccess.length === 0) {
        throw new ORPCError("NOT_FOUND", {
          message: "Squad nie istnieje lub nie masz do niego dostępu",
        });
      }

      const [squadData] = hasAccess;

      const members = await db
        .select({
          characterAvatarUrl: character.avatarUrl,
          characterGuildName: character.guildName,
          characterId: character.id,
          characterLevel: character.level,
          characterNick: character.nick,
          characterProfession: character.profession,
          characterProfessionName: character.professionName,
          characterWorld: character.world,
          gameAccountName: gameAccount.name,
          id: squadMember.id,
          position: squadMember.position,
          role: squadMember.role,
        })
        .from(squadMember)
        .innerJoin(character, eq(squadMember.characterId, character.id))
        .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
        .where(eq(squadMember.squadId, input.id))
        .orderBy(squadMember.position);

      const shares = await db
        .select({
          canEdit: squadShare.canEdit,
          id: squadShare.id,
          odUserId: user.id,
          userEmail: user.email,
          userImage: user.image,
          userName: user.name,
        })
        .from(squadShare)
        .innerJoin(user, eq(squadShare.sharedWithUserId, user.id))
        .where(eq(squadShare.squadId, input.id));

      return {
        ...squadData,
        isOwner: squadData?.userId === userId,
        members,
        shares,
      };
    }),

  removeGameAccountShare: protectedProcedure
    .input(z.object({ shareId: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const share = await db
        .select({ accountUserId: gameAccount.userId })
        .from(gameAccountShare)
        .innerJoin(
          gameAccount,
          eq(gameAccountShare.gameAccountId, gameAccount.id)
        )
        .where(eq(gameAccountShare.id, input.shareId))
        .limit(1);

      if (share.length === 0 || share[0]?.accountUserId !== userId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Nie masz dostępu do usunięcia tego udostępnienia",
        });
      }

      await db
        .delete(gameAccountShare)
        .where(eq(gameAccountShare.id, input.shareId));

      return { success: true };
    }),

  removeSquadShare: protectedProcedure
    .input(z.object({ shareId: z.number() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const share = await db
        .select({
          squadUserId: squad.userId,
        })
        .from(squadShare)
        .innerJoin(squad, eq(squadShare.squadId, squad.id))
        .where(eq(squadShare.id, input.shareId))
        .limit(1);

      if (share.length === 0 || share[0]?.squadUserId !== userId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Nie masz uprawnień do usunięcia tego udostępnienia",
        });
      }

      await db.delete(squadShare).where(eq(squadShare.id, input.shareId));

      return { success: true };
    }),

  shareGameAccount: protectedProcedure
    .input(shareGameAccountSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const account = await db
        .select()
        .from(gameAccount)
        .where(
          and(
            eq(gameAccount.id, input.accountId),
            eq(gameAccount.userId, userId)
          )
        )
        .limit(1);

      if (account.length === 0) {
        throw new ORPCError("FORBIDDEN", {
          message: "Nie masz dostępu do tego konta",
        });
      }

      if (input.userId === userId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Nie możesz udostępnić konta samemu sobie",
        });
      }

      const existing = await db
        .select()
        .from(gameAccountShare)
        .where(
          and(
            eq(gameAccountShare.gameAccountId, input.accountId),
            eq(gameAccountShare.sharedWithUserId, input.userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: true };
      }

      await db.insert(gameAccountShare).values({
        canManage: false,
        gameAccountId: input.accountId,
        sharedWithUserId: input.userId,
      });

      return { success: true };
    }),

  shareSquad: protectedProcedure
    .input(shareSquadSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const squadData = await db
        .select()
        .from(squad)
        .where(and(eq(squad.id, input.squadId), eq(squad.userId, userId)))
        .limit(1);

      if (squadData.length === 0) {
        throw new ORPCError("NOT_FOUND", {
          message: "Squad nie istnieje lub nie jesteś jego właścicielem",
        });
      }

      const targetUserId = input.userId;

      if (targetUserId === userId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Nie możesz udostępnić squadu samemu sobie",
        });
      }

      const existing = await db
        .select()
        .from(squadShare)
        .where(
          and(
            eq(squadShare.squadId, input.squadId),
            eq(squadShare.sharedWithUserId, targetUserId ?? "")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Share already exists, nothing to update
        return { success: true };
      }

      await db.insert(squadShare).values({
        canEdit: false,
        sharedWithUserId: targetUserId ?? "",
        squadId: input.squadId,
      });

      return { success: true };
    }),

  updateSquad: protectedProcedure
    .input(updateSquadSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      // Verify ownership
      const existingSquad = await db
        .select()
        .from(squad)
        .where(and(eq(squad.id, input.id), eq(squad.userId, userId)))
        .limit(1);

      if (existingSquad.length === 0) {
        throw new ORPCError("NOT_FOUND", {
          message: "Squad nie istnieje lub nie jesteś jego właścicielem",
        });
      }

      const squadWorld = existingSquad[0]?.world;

      // Validate members if provided
      if (input.memberIds.length > 0) {
        const characters = await db
          .select({
            id: character.id,
            world: character.world,
          })
          .from(character)
          .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
          .where(
            and(
              inArray(character.id, input.memberIds),
              or(
                eq(gameAccount.userId, userId),
                sql`EXISTS (
                  SELECT 1 FROM game_account_share gas
                  WHERE gas.game_account_id = ${gameAccount.id}
                    AND gas.shared_with_user_id = ${userId}
                )`
              )
            )
          );

        if (characters.length !== input.memberIds.length) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Niektóre postacie nie istnieją lub nie należą do Ciebie",
          });
        }

        const wrongWorld = characters.filter(
          (c) => c.world.toLowerCase() !== squadWorld?.toLowerCase()
        );
        if (wrongWorld.length > 0) {
          throw new ORPCError("BAD_REQUEST", {
            message:
              "Wszystkie postacie muszą być z tego samego świata co squad",
          });
        }
      }

      // Update squad, delete existing members and re-add in a transaction
      await db.transaction(async (tx) => {
        await tx
          .update(squad)
          .set({
            description: input.description,
            isPublic: input.isPublic,
            name: input.name,
            updatedAt: new Date(),
          })
          .where(eq(squad.id, input.id));

        await tx.delete(squadMember).where(eq(squadMember.squadId, input.id));

        if (input.memberIds.length > 0) {
          const memberValues = input.memberIds.map((charId, idx) => ({
            characterId: charId,
            position: idx + 1,
            squadId: input.id,
          }));

          await tx.insert(squadMember).values(memberValues);
        }
      });

      return { success: true };
    }),
};
