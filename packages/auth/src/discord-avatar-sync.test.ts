import { describe, expect, it } from "@effect/vitest";

import { syncDiscordAvatar } from "./discord-avatar-sync.ts";

const makeContext = (provider: string, path = "/callback/:id") => ({
  params: { id: provider },
  path,
});

describe("syncDiscordAvatar", () => {
  it("returns an image-only update for a Discord OAuth callback", async () => {
    const result = await syncDiscordAvatar(
      {
        email: "fresh@example.com",
        image: "https://cdn.discordapp.com/avatars/user/new.png",
        name: "Fresh Discord Name",
      },
      makeContext("discord")
    );

    expect(result).toEqual({
      data: {
        email: undefined,
        image: "https://cdn.discordapp.com/avatars/user/new.png",
        name: undefined,
      },
    });
  });

  it("leaves a Discord callback update without an image unchanged", async () => {
    const result = await syncDiscordAvatar(
      { email: "fresh@example.com", name: "Fresh Discord Name" },
      makeContext("discord")
    );

    expect(result).toBeUndefined();
  });

  it("leaves another provider's callback update unchanged", async () => {
    const result = await syncDiscordAvatar(
      {
        email: "fresh@example.com",
        image: "https://example.com/avatar.png",
        name: "Fresh Provider Name",
      },
      makeContext("github")
    );

    expect(result).toBeUndefined();
  });

  it("leaves normal profile updates unchanged", async () => {
    const result = await syncDiscordAvatar(
      {
        email: "updated@example.com",
        image: "https://example.com/avatar.png",
        name: "Updated Local Name",
      },
      { params: {}, path: "/update-user" }
    );

    expect(result).toBeUndefined();
  });
});
