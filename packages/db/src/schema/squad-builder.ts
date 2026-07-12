import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth.ts";

export const margonemAccount = pgTable(
  "margonem_accounts",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    displayName: text("display_name").notNull(),
    id: serial("id").primaryKey(),
    lastFetchedAt: timestamp("last_fetched_at"),
    ownerUserId: text("owner_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    profileId: integer("profile_id").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("margonem_accounts_profile_id_unique").on(table.profileId),
    index("margonem_accounts_owner_user_id_idx").on(table.ownerUserId),
  ]
);

export const margonemCharacter = pgTable(
  "margonem_characters",
  {
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
      .notNull(),
    avatarUrl: text("avatar_url"),
    characterId: integer("character_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    level: integer("level").notNull(),
    name: text("name").notNull(),
    profession: text("profession").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    world: text("world").notNull(),
  },
  (table) => [
    uniqueIndex("margonem_characters_account_character_unique").on(
      table.accountId,
      table.characterId
    ),
    index("margonem_characters_account_id_idx").on(table.accountId),
  ]
);

export const margonemAccountAccess = pgTable(
  "margonem_account_access",
  {
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    invitedByUserId: text("invited_by_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    uniqueIndex("margonem_account_access_account_user_unique").on(
      table.accountId,
      table.userId
    ),
    index("margonem_account_access_user_status_idx").on(
      table.userId,
      table.status
    ),
  ]
);

export const squadGroup = pgTable(
  "squad_groups",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    visibility: text("visibility").default("private").notNull(),
  },
  (table) => [index("squad_groups_owner_user_id_idx").on(table.ownerUserId)]
);

export const squad = pgTable(
  "squads",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    squadGroupId: integer("squad_group_id")
      .references(() => squadGroup.id, { onDelete: "cascade" })
      .notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("squads_group_id_idx").on(table.squadGroupId),
    uniqueIndex("squads_group_position_unique").on(
      table.squadGroupId,
      table.position
    ),
  ]
);

export const squadCharacter = pgTable(
  "squad_characters",
  {
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
      .notNull(),
    characterId: integer("character_id")
      .references(() => margonemCharacter.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    position: integer("position").notNull(),
    squadGroupId: integer("squad_group_id")
      .references(() => squadGroup.id, { onDelete: "cascade" })
      .notNull(),
    squadId: integer("squad_id")
      .references(() => squad.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => [
    uniqueIndex("squad_characters_squad_character_unique").on(
      table.squadId,
      table.characterId
    ),
    uniqueIndex("squad_characters_group_character_unique").on(
      table.squadGroupId,
      table.characterId
    ),
    uniqueIndex("squad_characters_squad_account_unique").on(
      table.squadId,
      table.accountId
    ),
    uniqueIndex("squad_characters_squad_position_unique").on(
      table.squadId,
      table.position
    ),
    index("squad_characters_group_id_idx").on(table.squadGroupId),
    index("squad_characters_character_id_idx").on(table.characterId),
    index("squad_characters_squad_id_idx").on(table.squadId),
  ]
);

export const squadGroupInvitation = pgTable(
  "squad_group_invitations",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    invitedByUserId: text("invited_by_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    invitedUserId: text("invited_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    squadGroupId: integer("squad_group_id")
      .references(() => squadGroup.id, { onDelete: "cascade" })
      .notNull(),
    status: text("status").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("squad_group_invitations_group_user_unique").on(
      table.squadGroupId,
      table.invitedUserId
    ),
    index("squad_group_invitations_user_status_idx").on(
      table.invitedUserId,
      table.status
    ),
  ]
);

export const margonemAccountImportPreview = pgTable(
  "margonem_account_import_previews",
  {
    actorUserId: text("actor_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    confirmedAt: timestamp("confirmed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    defaultDisplayName: text("default_display_name").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    fetchedAt: timestamp("fetched_at").notNull(),
    firecrawlCreditsUsed: integer("firecrawl_credits_used").notNull(),
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull(),
    suggestedAccountName: text("suggested_account_name").notNull(),
  },
  (table) => [
    index("margonem_import_previews_actor_status_idx").on(
      table.actorUserId,
      table.confirmedAt,
      table.expiresAt
    ),
    index("margonem_import_previews_profile_id_idx").on(table.profileId),
  ]
);

export const margonemAccountImportPreviewCharacter = pgTable(
  "margonem_account_import_preview_characters",
  {
    avatarUrl: text("avatar_url"),
    characterId: integer("character_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    importPreviewId: integer("import_preview_id")
      .references(() => margonemAccountImportPreview.id, {
        onDelete: "cascade",
      })
      .notNull(),
    level: integer("level").notNull(),
    name: text("name").notNull(),
    profession: text("profession").notNull(),
    world: text("world").notNull(),
  },
  (table) => [
    uniqueIndex("margonem_import_preview_characters_unique").on(
      table.importPreviewId,
      table.characterId
    ),
    index("margonem_import_preview_characters_preview_idx").on(
      table.importPreviewId
    ),
  ]
);

export const margonemAccountRefetchPreview = pgTable(
  "margonem_account_refetch_previews",
  {
    accountId: integer("account_id")
      .references(() => margonemAccount.id, { onDelete: "cascade" })
      .notNull(),
    actorUserId: text("actor_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    appliedAt: timestamp("applied_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    diffJson: text("diff_json").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    fetchedAt: timestamp("fetched_at").notNull(),
    firecrawlCreditsUsed: integer("firecrawl_credits_used").notNull(),
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull(),
  },
  (table) => [
    index("margonem_refetch_previews_actor_status_idx").on(
      table.actorUserId,
      table.appliedAt,
      table.expiresAt
    ),
    index("margonem_refetch_previews_account_id_idx").on(table.accountId),
  ]
);

export const margonemAccountRefetchPreviewCharacter = pgTable(
  "margonem_account_refetch_preview_characters",
  {
    avatarUrl: text("avatar_url"),
    characterId: integer("character_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    level: integer("level").notNull(),
    name: text("name").notNull(),
    profession: text("profession").notNull(),
    refetchPreviewId: integer("refetch_preview_id")
      .references(() => margonemAccountRefetchPreview.id, {
        onDelete: "cascade",
      })
      .notNull(),
    world: text("world").notNull(),
  },
  (table) => [
    uniqueIndex("margonem_refetch_preview_characters_unique").on(
      table.refetchPreviewId,
      table.characterId
    ),
    index("margonem_refetch_preview_characters_preview_idx").on(
      table.refetchPreviewId
    ),
  ]
);

export const firecrawlProfileScrapeRequest = pgTable(
  "firecrawl_profile_scrape_requests",
  {
    cacheState: text("cache_state"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    creditsUsed: integer("credits_used"),
    errorTag: text("error_tag"),
    firecrawlStatusCode: integer("firecrawl_status_code"),
    id: serial("id").primaryKey(),
    profileId: integer("profile_id").notNull(),
    requestedByUserId: text("requested_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull(),
    yearMonth: text("year_month").notNull(),
  },
  (table) => [
    index("firecrawl_scrape_year_month_status_idx").on(
      table.yearMonth,
      table.status
    ),
    index("firecrawl_scrape_profile_id_idx").on(table.profileId),
  ]
);

export const squadBuilder = {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
};
