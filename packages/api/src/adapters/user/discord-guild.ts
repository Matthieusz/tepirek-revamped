import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const DiscordGuilds = Schema.Array(
  Schema.Struct({
    id: Schema.String,
  })
);

/** Returns whether a Discord guild payload contains the requested guild id. */
export const hasDiscordGuild = (guilds: unknown, guildId: string): boolean => {
  if (guildId === "") {
    return false;
  }

  return Schema.decodeUnknownOption(DiscordGuilds)(guilds).pipe(
    Option.exists(Arr.some((guild) => guild.id === guildId))
  );
};
