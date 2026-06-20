import { createRouterClient } from "@orpc/server";
import { user } from "@tepirek-revamped/db/schema/auth";
import { describe, expect, it } from "vitest";

import { testDb } from "../test/integration/database";
import { appRouter } from "./index";
import type { RouterContext } from "./procedures";

const createVerifiedUser = async () => {
  const now = new Date();

  await testDb.insert(user).values({
    createdAt: now,
    email: "auction-user@example.com",
    emailVerified: true,
    id: "auction-user",
    image: "https://example.com/avatar.png",
    name: "Auction User",
    updatedAt: now,
    verified: true,
  });
};

const createTestClient = () =>
  createRouterClient(appRouter, {
    context: {
      logger: {} as RouterContext["logger"],
      session: {
        session: {
          id: "test-session",
          token: "test-token",
          userId: "auction-user",
        },
        user: {
          id: "auction-user",
          role: "user",
          verified: true,
        },
      },
    } as RouterContext,
  });

describe("auction router Postgres integration", () => {
  it("writes a signup and reads it back through the router boundary", async () => {
    await createVerifiedUser();
    const client = createTestClient();

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
        userId: "auction-user",
        userImage: "https://example.com/avatar.png",
        userName: "Auction User",
      },
    ]);
  });
});
