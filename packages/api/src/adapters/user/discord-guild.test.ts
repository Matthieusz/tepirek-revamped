import { describe, expect, it } from "vite-plus/test";

import { hasDiscordGuild } from "./discord-guild.ts";

describe("hasDiscordGuild", () => {
  it("returns true when the guild list contains the target id", () => {
    expect(
      hasDiscordGuild([{ id: "guild-1" }, { id: "guild-2" }], "guild-2")
    ).toBe(true);
  });

  it("returns false for an empty target guild id", () => {
    expect(hasDiscordGuild([{ id: "" }], "")).toBe(false);
  });
});
