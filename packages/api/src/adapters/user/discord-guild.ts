import * as Schema from "effect/Schema";

const DiscordGuild = Schema.Struct({
  id: Schema.String,
});

type DiscordGuild = typeof DiscordGuild.Type;

/** Schema for the Discord guild-list response. */
export const DiscordGuilds = Schema.Array(DiscordGuild);

/** A decoded, readonly Discord guild-list response. */
export type DiscordGuilds = typeof DiscordGuilds.Type;

/** Returns whether decoded Discord guilds contain the requested guild id. */
export const hasDiscordGuild = (guilds: DiscordGuilds, guildId: string) =>
  guildId !== "" && guilds.some((guild) => guild.id === guildId);
