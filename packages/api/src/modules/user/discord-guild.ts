/** Returns whether a Discord guild payload contains the requested guild id. */
export const hasDiscordGuild = (guilds: unknown, guildId: string): boolean => {
  if (guildId === "" || !Array.isArray(guilds)) {
    return false;
  }

  return guilds.some(
    (guild) =>
      typeof guild === "object" &&
      guild !== null &&
      "id" in guild &&
      guild.id === guildId
  );
};
