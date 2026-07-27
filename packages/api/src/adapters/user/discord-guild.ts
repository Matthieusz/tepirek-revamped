import * as Schema from "effect/Schema";

/** Schema for the Discord guild fields trusted by membership verification. */
const DiscordGuild = Schema.Struct({
  id: Schema.String,
});

/** A Discord guild decoded at the HTTP response boundary. */
type DiscordGuild = typeof DiscordGuild.Type;

/** Schema for the Discord guild-list response. */
export const DiscordGuilds = Schema.Array(DiscordGuild);

/** A decoded, readonly Discord guild-list response. */
export type DiscordGuilds = typeof DiscordGuilds.Type;

/** Returns whether decoded Discord guilds contain the requested guild id. */
export const hasDiscordGuild = (
  guilds: DiscordGuilds,
  guildId: string
): boolean => guildId !== "" && guilds.some((guild) => guild.id === guildId);
