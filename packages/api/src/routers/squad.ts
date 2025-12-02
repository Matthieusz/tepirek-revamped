import { db } from "@tepirek-revamped/db";
import { user } from "@tepirek-revamped/db/schema/auth";
import {
  character,
  gameAccount,
  squad,
  squadMember,
  squadShare,
} from "@tepirek-revamped/db/schema/squad";
import { and, eq, inArray, sql } from "drizzle-orm";
import z from "zod";
import { protectedProcedure } from "../index";

// Schema do parsowania postaci z HTML
const parsedCharacterSchema = z.object({
  externalId: z.number(),
  nick: z.string(),
  level: z.number(),
  profession: z.string(),
  professionName: z.string(),
  world: z.string(),
  gender: z.string().optional(),
  guildName: z.string().optional(),
  guildId: z.number().optional(),
  avatarUrl: z.string().optional(),
});

const createGameAccountSchema = z.object({
  name: z.string().min(1),
  profileUrl: z.string().optional(),
  accountLevel: z.number().optional(),
  characters: z.array(parsedCharacterSchema),
});

const createSquadSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  world: z.string().min(1),
  isPublic: z.boolean().default(false),
  memberIds: z.array(z.number()).max(10),
});

const shareSquadSchema = z.object({
  squadId: z.number(),
  userId: z.string().min(1),
  canEdit: z.boolean().default(false),
});

const updateSquadSchema = z.object({
  id: z.number(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean(),
  memberIds: z.array(z.number()).max(10),
});

function assertUserId(userId: string | undefined): asserts userId is string {
  if (!userId) {
    throw new Error("Unauthorized");
  }
}

export const squadRouter = {
  // === Game Account Management ===

  getMyGameAccounts: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    assertUserId(userId);

    return await db
      .select()
      .from(gameAccount)
      .where(eq(gameAccount.userId, userId))
      .orderBy(gameAccount.name);
  }),

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
        throw new Error("Konto o tej nazwie już istnieje");
      }

      const [newAccount] = await db
        .insert(gameAccount)
        .values({
          name: input.name,
          profileUrl: input.profileUrl,
          accountLevel: input.accountLevel,
          userId,
        })
        .returning();

      if (input.characters.length > 0 && newAccount) {
        const characterValues = input.characters.map((char) => ({
          externalId: char.externalId,
          nick: char.nick,
          level: char.level,
          profession: char.profession,
          professionName: char.professionName,
          world: char.world.toLowerCase(),
          gender: char.gender,
          guildName: char.guildName || null,
          guildId: char.guildId || null,
          avatarUrl: char.avatarUrl,
          gameAccountId: newAccount.id,
        }));

        await db.insert(character).values(characterValues);
      }

      return newAccount;
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

  // === Character Management ===

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
        throw new Error("Postać nie istnieje lub nie masz do niej dostępu");
      }

      await db.delete(character).where(eq(character.id, input.id));

      return { success: true };
    }),

  getMyCharacters: protectedProcedure
    .input(
      z
        .object({
          world: z.string().optional(),
          gameAccountId: z.number().optional(),
        })
        .optional()
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      assertUserId(userId);

      const conditions = [eq(gameAccount.userId, userId)];

      if (input?.world) {
        conditions.push(eq(character.world, input.world.toLowerCase()));
      }

      if (input?.gameAccountId) {
        conditions.push(eq(character.gameAccountId, input.gameAccountId));
      }

      return await db
        .select({
          id: character.id,
          externalId: character.externalId,
          nick: character.nick,
          level: character.level,
          profession: character.profession,
          professionName: character.professionName,
          world: character.world,
          gender: character.gender,
          guildName: character.guildName,
          guildId: character.guildId,
          avatarUrl: character.avatarUrl,
          gameAccountId: character.gameAccountId,
          gameAccountName: gameAccount.name,
        })
        .from(character)
        .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
        .where(and(...conditions))
        .orderBy(character.level);
    }),

  // === Squad Management ===

  getMySquads: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    assertUserId(userId);

    const ownedSquads = await db
      .select({
        id: squad.id,
        name: squad.name,
        description: squad.description,
        world: squad.world,
        isPublic: squad.isPublic,
        createdAt: squad.createdAt,
        updatedAt: squad.updatedAt,
        isOwner: sql<boolean>`true`.as("is_owner"),
        canEdit: sql<boolean>`true`.as("can_edit"),
        ownerName: user.name,
      })
      .from(squad)
      .innerJoin(user, eq(squad.userId, user.id))
      .where(eq(squad.userId, userId));

    const sharedSquads = await db
      .select({
        id: squad.id,
        name: squad.name,
        description: squad.description,
        world: squad.world,
        isPublic: squad.isPublic,
        createdAt: squad.createdAt,
        updatedAt: squad.updatedAt,
        isOwner: sql<boolean>`false`.as("is_owner"),
        canEdit: squadShare.canEdit,
        ownerName: user.name,
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
        throw new Error("Squad nie istnieje lub nie masz do niego dostępu");
      }

      const squadData = hasAccess[0];

      const members = await db
        .select({
          id: squadMember.id,
          position: squadMember.position,
          role: squadMember.role,
          characterId: character.id,
          characterNick: character.nick,
          characterLevel: character.level,
          characterProfession: character.profession,
          characterProfessionName: character.professionName,
          characterWorld: character.world,
          characterAvatarUrl: character.avatarUrl,
          characterGuildName: character.guildName,
          gameAccountName: gameAccount.name,
        })
        .from(squadMember)
        .innerJoin(character, eq(squadMember.characterId, character.id))
        .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
        .where(eq(squadMember.squadId, input.id))
        .orderBy(squadMember.position);

      const shares = await db
        .select({
          id: squadShare.id,
          canEdit: squadShare.canEdit,
          odUserId: user.id,
          userName: user.name,
          userEmail: user.email,
          userImage: user.image,
        })
        .from(squadShare)
        .innerJoin(user, eq(squadShare.sharedWithUserId, user.id))
        .where(eq(squadShare.squadId, input.id));

      return {
        ...squadData,
        members,
        shares,
        isOwner: squadData?.userId === userId,
      };
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
              eq(gameAccount.userId, userId)
            )
          );

        if (characters.length !== input.memberIds.length) {
          throw new Error(
            "Niektóre postacie nie istnieją lub nie należą do Ciebie"
          );
        }

        const wrongWorld = characters.filter(
          (c) => c.world.toLowerCase() !== input.world.toLowerCase()
        );
        if (wrongWorld.length > 0) {
          throw new Error(
            "Wszystkie postacie muszą być z tego samego świata co squad"
          );
        }
      }

      const [newSquad] = await db
        .insert(squad)
        .values({
          name: input.name,
          description: input.description,
          world: input.world.toLowerCase(),
          isPublic: input.isPublic,
          userId,
        })
        .returning();

      if (input.memberIds.length > 0 && newSquad) {
        const memberValues = input.memberIds.map((charId, idx) => ({
          squadId: newSquad.id,
          characterId: charId,
          position: idx + 1,
        }));

        await db.insert(squadMember).values(memberValues);
      }

      return newSquad;
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
        throw new Error("Squad nie istnieje lub nie jesteś jego właścicielem");
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
              eq(gameAccount.userId, userId)
            )
          );

        if (characters.length !== input.memberIds.length) {
          throw new Error(
            "Niektóre postacie nie istnieją lub nie należą do Ciebie"
          );
        }

        const wrongWorld = characters.filter(
          (c) => c.world.toLowerCase() !== squadWorld?.toLowerCase()
        );
        if (wrongWorld.length > 0) {
          throw new Error(
            "Wszystkie postacie muszą być z tego samego świata co squad"
          );
        }
      }

      // Update squad
      await db
        .update(squad)
        .set({
          name: input.name,
          description: input.description,
          isPublic: input.isPublic,
          updatedAt: new Date(),
        })
        .where(eq(squad.id, input.id));

      // Delete existing members and re-add
      await db.delete(squadMember).where(eq(squadMember.squadId, input.id));

      if (input.memberIds.length > 0) {
        const memberValues = input.memberIds.map((charId, idx) => ({
          squadId: input.id,
          characterId: charId,
          position: idx + 1,
        }));

        await db.insert(squadMember).values(memberValues);
      }

      return { success: true };
    }),

  // === Squad Sharing ===

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
        throw new Error("Squad nie istnieje lub nie jesteś jego właścicielem");
      }

      const targetUserId = input.userId;

      if (targetUserId === userId) {
        throw new Error("Nie możesz udostępnić squadu samemu sobie");
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
        await db
          .update(squadShare)
          .set({ canEdit: input.canEdit })
          .where(eq(squadShare.id, existing[0]?.id ?? 0));
      } else {
        await db.insert(squadShare).values({
          squadId: input.squadId,
          sharedWithUserId: targetUserId ?? "",
          canEdit: input.canEdit,
        });
      }

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
        throw new Error("Nie masz uprawnień do usunięcia tego udostępnienia");
      }

      await db.delete(squadShare).where(eq(squadShare.id, input.shareId));

      return { success: true };
    }),

  // === Utilities ===

  getAvailableWorlds: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;
    assertUserId(userId);

    const worlds = await db
      .selectDistinct({ world: character.world })
      .from(character)
      .innerJoin(gameAccount, eq(character.gameAccountId, gameAccount.id))
      .where(eq(gameAccount.userId, userId));

    return worlds.map((w) => w.world);
  }),
};
