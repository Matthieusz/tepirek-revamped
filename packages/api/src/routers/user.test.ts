import { describe, expect, it } from "vitest";

import { hasDiscordGuild } from "./user";

describe("hasDiscordGuild", () => {
  it("returns true when the guild list contains the target id", () => {
    expect(
      hasDiscordGuild([{ id: "guild-1" }, { id: "guild-2" }], "guild-2")
    ).toBe(true);
  });

  it("returns false when the guild list does not contain the target id", () => {
    expect(hasDiscordGuild([{ id: "guild-1" }], "guild-2")).toBe(false);
  });

  it("returns false for invalid guild payloads", () => {
    expect(hasDiscordGuild({ id: "guild-1" }, "guild-1")).toBe(false);
  });

  it("returns false for an empty target guild id", () => {
    expect(hasDiscordGuild([{ id: "guild-1" }], "")).toBe(false);
  });
});
