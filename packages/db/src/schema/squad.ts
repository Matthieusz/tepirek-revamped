import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

// Konto z gry Margonem (konto może mieć wiele postaci)
export const gameAccount = pgTable(
  "game_account",
  {
    // Poziom konta
    accountLevel: integer("account_level"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    // Nazwa konta (np. "informati")
    name: text("name").notNull(),
    // URL do profilu na margonem.pl
    profileUrl: text("profile_url"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("game_account_user_id_idx").on(table.userId),
    unique("game_account_user_name_unique").on(table.userId, table.name),
  ]
);

export const gameAccountShare = pgTable(
  "game_account_share",
  {
    canManage: boolean("can_manage").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    gameAccountId: integer("game_account_id")
      .notNull()
      .references(() => gameAccount.id, { onDelete: "cascade" }),
    id: serial("id").primaryKey(),
    sharedWithUserId: text("shared_with_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("game_account_share_account_id_idx").on(table.gameAccountId),
    index("game_account_share_shared_user_id_idx").on(table.sharedWithUserId),
    unique("game_account_share_unique").on(
      table.gameAccountId,
      table.sharedWithUserId
    ),
  ]
);

// Profesje postaci w grze
export const professionCode = {
  b: "Tancerz ostrzy",
  h: "Łowca",
  m: "Mag",
  p: "Paladyn",
  t: "Tropiciel",
  w: "Wojownik",
} as const;

export type ProfessionCode = keyof typeof professionCode;

// Postać w grze Margonem
export const character = pgTable(
  "character",
  {
    // URL do obrazka postaci
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    // ID z Margonem
    externalId: integer("external_id").notNull(),
    gameAccountId: integer("game_account_id")
      .notNull()
      .references(() => gameAccount.id, { onDelete: "cascade" }),
    // m lub k
    gender: text("gender"),
    guildId: integer("guild_id"),
    guildName: text("guild_name"),
    id: serial("id").primaryKey(),
    level: integer("level").notNull(),
    nick: text("nick").notNull(),
    // kod profesji: w, m, h, b, t, p
    profession: text("profession").notNull(),
    // pełna nazwa: Wojownik, Mag, etc.
    professionName: text("profession_name").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    // np. "jaruna", "gordion"
    world: text("world").notNull(),
  },
  (table) => [
    index("character_game_account_id_idx").on(table.gameAccountId),
    index("character_world_idx").on(table.world),
    unique("character_external_id_world_unique").on(
      table.externalId,
      table.world
    ),
  ]
);

// Squad (drużyna) - max 10 postaci
export const squad = pgTable(
  "squad",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    description: text("description"),
    id: serial("id").primaryKey(),
    // czy publicznie widoczny
    isPublic: boolean("is_public").default(false).notNull(),
    name: text("name").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // świat, na którym gra drużyna
    world: text("world").notNull(),
  },
  (table) => [
    index("squad_user_id_idx").on(table.userId),
    index("squad_world_idx").on(table.world),
  ]
);

// Członkowie squadu
export const squadMember = pgTable(
  "squad_member",
  {
    characterId: integer("character_id")
      .notNull()
      .references(() => character.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    // pozycja w drużynie 1-10
    position: integer("position").notNull(),
    // opcjonalna rola w drużynie (np. "tank", "healer")
    role: text("role"),
    squadId: integer("squad_id")
      .notNull()
      .references(() => squad.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("squad_member_squad_id_idx").on(table.squadId),
    index("squad_member_character_id_idx").on(table.characterId),
    unique("squad_member_squad_character_unique").on(
      table.squadId,
      table.characterId
    ),
    unique("squad_member_squad_position_unique").on(
      table.squadId,
      table.position
    ),
  ]
);

// Udostępnienie squadu innemu użytkownikowi
export const squadShare = pgTable(
  "squad_share",
  {
    // czy może edytować
    canEdit: boolean("can_edit").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    sharedWithUserId: text("shared_with_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    squadId: integer("squad_id")
      .notNull()
      .references(() => squad.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("squad_share_squad_id_idx").on(table.squadId),
    index("squad_share_shared_with_user_id_idx").on(table.sharedWithUserId),
    unique("squad_share_squad_user_unique").on(
      table.squadId,
      table.sharedWithUserId
    ),
  ]
);

export const squadSchema = {
  character,
  gameAccount,
  gameAccountShare,
  squad,
  squadMember,
  squadShare,
};
