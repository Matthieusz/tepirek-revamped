import { ORPCError } from "@orpc/server";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { createVerifiedMember } from "../test/integration/builders.js";
import { testDb } from "../test/integration/database.js";
import { createAuthenticatedRouterClient } from "../test/integration/router-client.js";

const paladinMainSlot = {
  column: 1,
  level: 30,
  profession: "paladin",
  round: 1,
  type: "main",
} as const;

describe("auction router Postgres integration", () => {
  it("lets a verified member sign up for an available auction slot", async () => {
    const member = await createVerifiedMember({
      id: "auction-member",
      image: "https://example.com/avatar.png",
      name: "Auction Member",
    });
    const client = createAuthenticatedRouterClient(member);

    await expect(client.auction.toggleSignup(paladinMainSlot)).resolves.toEqual(
      {
        action: "added",
      }
    );

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

  it("lets a verified member toggle their own auction signup off", async () => {
    const member = await createVerifiedMember({ id: "toggle-member" });
    const client = createAuthenticatedRouterClient(member);

    await client.auction.toggleSignup(paladinMainSlot);

    await expect(client.auction.toggleSignup(paladinMainSlot)).resolves.toEqual(
      {
        action: "removed",
      }
    );

    await expect(
      client.auction.getSignups({ profession: "paladin", type: "main" })
    ).resolves.toEqual([]);
  });

  it("keeps auction signup working when the slot unique index is absent", async () => {
    const member = await createVerifiedMember({ id: "missing-index-member" });
    const client = createAuthenticatedRouterClient(member);

    await testDb.execute(sql`drop index if exists auction_slot_unique_idx`);

    try {
      await expect(
        client.auction.toggleSignup(paladinMainSlot)
      ).resolves.toEqual({
        action: "added",
      });
    } finally {
      await testDb.execute(sql`
        create unique index if not exists auction_slot_unique_idx
        on auction_signups (profession, type, level, round, "column")
      `);
    }
  });

  it("prevents a second verified member from taking an occupied auction slot", async () => {
    const firstMember = await createVerifiedMember({ id: "first-member" });
    const secondMember = await createVerifiedMember({ id: "second-member" });
    const firstClient = createAuthenticatedRouterClient(firstMember);
    const secondClient = createAuthenticatedRouterClient(secondMember);

    await firstClient.auction.toggleSignup(paladinMainSlot);

    await expect(
      secondClient.auction.toggleSignup(paladinMainSlot)
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("rejects an illegal auction slot coordinate at the router seam", async () => {
    const member = await createVerifiedMember({ id: "illegal-slot-member" });
    const client = createAuthenticatedRouterClient(member);

    // hunter support only has two columns
    await expect(
      client.auction.toggleSignup({
        column: 3,
        level: 30,
        profession: "hunter",
        round: 1,
        type: "support",
      })
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it("reports persisted auction signup totals and unique member counts", async () => {
    const firstMember = await createVerifiedMember({ id: "stats-member-one" });
    const secondMember = await createVerifiedMember({ id: "stats-member-two" });
    const firstClient = createAuthenticatedRouterClient(firstMember);
    const secondClient = createAuthenticatedRouterClient(secondMember);

    await firstClient.auction.toggleSignup(paladinMainSlot);
    await secondClient.auction.toggleSignup({ ...paladinMainSlot, column: 2 });

    await expect(
      firstClient.auction.getStats({ profession: "paladin", type: "main" })
    ).resolves.toEqual({ totalSignups: 2, uniqueUsers: 2 });
  });
});
