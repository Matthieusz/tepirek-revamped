import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import {
  createAdmin,
  createEvent,
  createHero,
  createVerifiedMember,
} from "../test/integration/builders.js";
import { createAuthenticatedRouterClient } from "../test/integration/router-client.js";

describe("ranking router Postgres integration", () => {
  it("reports hero stats and rankings from persisted bets and vault distribution", async () => {
    const admin = await createAdmin({ id: "ranking-admin" });
    const firstMember = await createVerifiedMember({
      id: "ranking-member-one",
      name: "Ranking Member One",
    });
    const secondMember = await createVerifiedMember({
      id: "ranking-member-two",
      name: "Ranking Member Two",
    });
    const event = await createEvent({ name: "Ranking Event" });
    const hero = await createHero({ eventId: event.id, name: "Ranking Hero" });
    const client = createAuthenticatedRouterClient(admin);

    await client.bet.create({ heroId: hero.id, userIds: [firstMember.id] });
    await client.bet.create({
      heroId: hero.id,
      userIds: [firstMember.id, secondMember.id],
    });
    await client.vault.distributeGold({
      goldAmount: 200_000_000,
      heroId: hero.id,
    });

    await expect(
      client.ranking.getHeroStats({ heroId: hero.id })
    ).resolves.toEqual({
      currentPointWorth: 5_000_000,
      heroId: hero.id,
      heroName: "Ranking Hero",
      totalBets: 3,
      totalPoints: 40,
    });

    const heroRanking = await client.ranking.getRanking({ heroId: hero.id });
    expect(heroRanking).toMatchObject({ pointWorth: 5_000_000, totalBets: 2 });
    expect(heroRanking.ranking).toEqual([
      expect.objectContaining({
        totalEarnings: "150000000.00",
        totalPoints: "30.00",
        userId: firstMember.id,
        userName: "Ranking Member One",
      }),
      expect.objectContaining({
        totalEarnings: "50000000.00",
        totalPoints: "10.00",
        userId: secondMember.id,
        userName: "Ranking Member Two",
      }),
    ]);

    await expect(
      client.ranking.getRanking({ eventId: event.id })
    ).resolves.toMatchObject({ pointWorth: null, totalBets: 2 });
    await expect(client.ranking.getRanking({})).resolves.toMatchObject({
      pointWorth: null,
      totalBets: 2,
    });
  });

  it("returns the oldest unpaid event above the minimum earnings threshold", async () => {
    const admin = await createAdmin({ id: "oldest-ranking-admin" });
    const member = await createVerifiedMember({ id: "oldest-ranking-member" });
    const olderEvent = await createEvent({
      endTime: new Date("2029-01-01T00:00:00.000Z"),
      name: "Older Event",
    });
    const newerEvent = await createEvent({
      endTime: new Date("2030-01-01T00:00:00.000Z"),
      name: "Newer Event",
    });
    const olderHero = await createHero({
      eventId: olderEvent.id,
      name: "Older Hero",
    });
    const newerHero = await createHero({
      eventId: newerEvent.id,
      name: "Newer Hero",
    });
    const client = createAuthenticatedRouterClient(admin);

    await client.bet.create({ heroId: newerHero.id, userIds: [member.id] });
    await client.vault.distributeGold({
      goldAmount: 200_000_000,
      heroId: newerHero.id,
    });
    await client.bet.create({ heroId: olderHero.id, userIds: [member.id] });
    await client.vault.distributeGold({
      goldAmount: 200_000_000,
      heroId: olderHero.id,
    });

    await expect(client.ranking.getOldestUnpaidEvent()).resolves.toBe(
      olderEvent.id
    );
  });

  it("returns null when no unpaid event reaches the minimum earnings threshold", async () => {
    const member = await createVerifiedMember({ id: "empty-ranking-member" });
    const client = createAuthenticatedRouterClient(member);

    await expect(client.ranking.getOldestUnpaidEvent()).resolves.toBeNull();
  });

  it("rejects hero stats for a missing hero", async () => {
    const member = await createVerifiedMember({ id: "missing-hero-member" });
    const client = createAuthenticatedRouterClient(member);

    await expect(
      client.ranking.getHeroStats({ heroId: 999_999 })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      client.ranking.getHeroStats({ heroId: 999_999 })
    ).rejects.toBeInstanceOf(ORPCError);
  });
});
