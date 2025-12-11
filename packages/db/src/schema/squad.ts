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
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // Nazwa konta (np. "informati")
    profileUrl: text("profile_url"), // URL do profilu na margonem.pl
    accountLevel: integer("account_level"), // Poziom konta
    createdAt: timestamp("created_at").defaultNow().notNull(),
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
    id: serial("id").primaryKey(),
    canManage: boolean("can_manage").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    gameAccountId: integer("game_account_id")
      .notNull()
      .references(() => gameAccount.id, { onDelete: "cascade" }),
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
  w: "Wojownik",
  m: "Mag",
  h: "Łowca",
  b: "Tancerz ostrzy",
  t: "Tropiciel",
  p: "Paladyn",
} as const;

export type ProfessionCode = keyof typeof professionCode;

// Postać w grze Margonem
export const character = pgTable(
  "character",
  {
    id: serial("id").primaryKey(),
    externalId: integer("external_id").notNull(), // ID z Margonem
    nick: text("nick").notNull(),
    level: integer("level").notNull(),
    profession: text("profession").notNull(), // kod profesji: w, m, h, b, t, p
    professionName: text("profession_name").notNull(), // pełna nazwa: Wojownik, Mag, etc.
    world: text("world").notNull(), // np. "jaruna", "gordion"
    gender: text("gender"), // m lub k
    guildName: text("guild_name"),
    guildId: integer("guild_id"),
    avatarUrl: text("avatar_url"), // URL do obrazka postaci
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    gameAccountId: integer("game_account_id")
      .notNull()
      .references(() => gameAccount.id, { onDelete: "cascade" }),
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
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    world: text("world").notNull(), // świat, na którym gra drużyna
    isPublic: boolean("is_public").default(false).notNull(), // czy publicznie widoczny
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    id: serial("id").primaryKey(),
    position: integer("position").notNull(), // pozycja w drużynie 1-10
    role: text("role"), // opcjonalna rola w drużynie (np. "tank", "healer")
    createdAt: timestamp("created_at").defaultNow().notNull(),
    squadId: integer("squad_id")
      .notNull()
      .references(() => squad.id, { onDelete: "cascade" }),
    characterId: integer("character_id")
      .notNull()
      .references(() => character.id, { onDelete: "cascade" }),
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
    id: serial("id").primaryKey(),
    canEdit: boolean("can_edit").default(false).notNull(), // czy może edytować
    createdAt: timestamp("created_at").defaultNow().notNull(),
    squadId: integer("squad_id")
      .notNull()
      .references(() => squad.id, { onDelete: "cascade" }),
    sharedWithUserId: text("shared_with_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
  gameAccount,
  gameAccountShare,
  character,
  squad,
  squadMember,
  squadShare,
};
