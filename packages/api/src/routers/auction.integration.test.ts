import { describe, expect, it } from "vitest";

import { createVerifiedMember } from "../test/integration/builders";
import { createAuthenticatedRouterClient } from "../test/integration/router-client";

describe("auction router Postgres integration", () => {
  it("lets a verified member add and read an auction signup", async () => {
    const member = await createVerifiedMember({
      id: "auction-member",
      image: "https://example.com/avatar.png",
      name: "Auction Member",
    });
    const client = createAuthenticatedRouterClient(member);

    await expect(
      client.auction.toggleSignup({
        column: 1,
        level: 30,
        profession: "paladin",
        round: 1,
        type: "main",
      })
    ).resolves.toEqual({ action: "added" });

    const signups = await client.auction.getSignups({
      profession: "paladin",
      type: "main",
    });

    expect(signups).toMatchObject([
      {
        column: 1,
        level: 30,
        round: 1,
        userId: "auction-member",
        userImage: "https://example.com/avatar.png",
        userName: "Auction Member",
      },
    ]);
  });
});
