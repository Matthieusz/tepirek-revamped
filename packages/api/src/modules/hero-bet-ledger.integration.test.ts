import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import {
  hero,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import { eq } from "drizzle-orm";
import type * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  HeroBetLedger,
  HeroBetLedgerLayer,
} from "../adapters/hero-bet-ledger.js";
import type { HeroBetLedgerService } from "../adapters/hero-bet-ledger.js";
import { liveEffect } from "../test/effect.js";
import {
  createHero,
  createVerifiedMember,
} from "../test/integration/builders.js";
import {
  defaultTestDatabaseUrl,
  testDb,
} from "../test/integration/database.js";

const sortByUserId = <T extends { userId: string }>(rows: T[]) =>
  rows.toSorted((left, right) => left.userId.localeCompare(right.userId));

const testLayer = HeroBetLedgerLayer.pipe(
  Layer.provide(makeLiveDatabaseLayer(defaultTestDatabaseUrl))
);

const withLedger = <A>(
  f: (ledger: HeroBetLedgerService) => Effect.Effect<A, unknown>
) => liveEffect(testLayer, HeroBetLedger.use(f));

const expectLedgerError = async (
  action: Promise<unknown>,
  tag: string,
  message: string
) => {
  await expect(action).rejects.toMatchObject({ _tag: tag, message });
};

describe("HeroBetLedger characterization", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a bet with internally timestamped raw bet rows and per-member stats", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T10:11:12.000Z"));

    const creator = await createVerifiedMember({ id: "ledger-create-admin" });
    const firstMember = await createVerifiedMember({
      id: "ledger-create-first",
    });
    const secondMember = await createVerifiedMember({
      id: "ledger-create-second",
    });
    const thirdMember = await createVerifiedMember({
      id: "ledger-create-third",
    });
    const createdHero = await createHero({ name: "Ledger Create Hero" });

    const bet = await withLedger((ledger) =>
      ledger.createBet({
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [firstMember.id, secondMember.id, thirdMember.id],
      })
    );

    expect(bet).toMatchObject({
      createdAt: new Date("2026-07-05T10:11:12.000Z"),
      createdBy: creator.id,
      heroId: createdHero.id,
      memberCount: 3,
    });
    expect(bet.id).toEqual(expect.any(Number));

    const members = await withLedger((ledger) => ledger.getBetMembers(bet.id));
    expect(sortByUserId(members)).toEqual([
      { id: expect.any(Number), points: "6.66", userId: firstMember.id },
      { id: expect.any(Number), points: "6.66", userId: secondMember.id },
      { id: expect.any(Number), points: "6.66", userId: thirdMember.id },
    ]);

    const stats = await testDb
      .select({
        bets: userStats.bets,
        earnings: userStats.earnings,
        eventId: userStats.eventId,
        heroId: userStats.heroId,
        paidOut: userStats.paidOut,
        points: userStats.points,
        userId: userStats.userId,
      })
      .from(userStats)
      .where(eq(userStats.heroId, createdHero.id));

    expect(sortByUserId(stats)).toEqual([
      {
        bets: 1,
        earnings: "0.00",
        eventId: createdHero.eventId,
        heroId: createdHero.id,
        paidOut: false,
        points: "6.66",
        userId: firstMember.id,
      },
      {
        bets: 1,
        earnings: "0.00",
        eventId: createdHero.eventId,
        heroId: createdHero.id,
        paidOut: false,
        points: "6.66",
        userId: secondMember.id,
      },
      {
        bets: 1,
        earnings: "0.00",
        eventId: createdHero.eventId,
        heroId: createdHero.id,
        paidOut: false,
        points: "6.66",
        userId: thirdMember.id,
      },
    ]);
  });

  it("returns typed ledger errors for validation and not-found failures", async () => {
    const creator = await createVerifiedMember({ id: "ledger-errors-admin" });
    const member = await createVerifiedMember({ id: "ledger-errors-member" });
    const createdHero = await createHero({ name: "Ledger Errors Hero" });

    await expectLedgerError(
      withLedger((ledger) =>
        ledger.createBet({
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [member.id, member.id],
        })
      ),
      "HeroBetLedgerBadRequest",
      "Ten sam gracz nie może być wybrany dwa razy"
    );

    await expectLedgerError(
      withLedger((ledger) =>
        ledger.createBet({
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [""],
        })
      ),
      "HeroBetLedgerBadRequest",
      "Wybierz tylko zweryfikowanych graczy"
    );

    await expectLedgerError(
      withLedger((ledger) => ledger.deleteBet(123_456)),
      "HeroBetLedgerNotFound",
      "Obstawienie nie znalezione"
    );

    await expectLedgerError(
      withLedger((ledger) => ledger.getHeroStats(123_456)),
      "HeroBetLedgerNotFound",
      "Heros nie znaleziony"
    );
  });

  it("distributes gold into point worth, rankings, vault rows, and paid-out toggles", async () => {
    const creator = await createVerifiedMember({ id: "ledger-dist-admin" });
    const firstMember = await createVerifiedMember({
      id: "ledger-dist-first",
      image: "https://example.com/first.png",
      name: "First Ledger Member",
    });
    const secondMember = await createVerifiedMember({
      id: "ledger-dist-second",
      image: "https://example.com/second.png",
      name: "Second Ledger Member",
    });
    const createdHero = await createHero({ name: "Ledger Distribution Hero" });
    await withLedger((ledger) =>
      ledger.createBet({
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [firstMember.id, secondMember.id],
      })
    );

    const distribution = await withLedger((ledger) =>
      ledger.distributeGold({
        goldAmount: 2_000_000_000,
        heroId: createdHero.id,
      })
    );

    expect(distribution).toEqual({
      goldAmount: 2_000_000_000,
      heroId: createdHero.id,
      heroName: "Ledger Distribution Hero",
      pointWorth: 100_000_000,
      success: true,
      totalPoints: 20,
      usersUpdated: 2,
    });

    const [heroStats] = await testDb
      .select({ pointWorth: hero.pointWorth })
      .from(hero)
      .where(eq(hero.id, createdHero.id));
    expect(heroStats).toEqual({ pointWorth: "100000000.000000" });

    const ranking = await withLedger((ledger) =>
      ledger.getRanking({ heroId: createdHero.id })
    );
    expect(ranking).toEqual({
      pointWorth: 100_000_000,
      ranking: expect.arrayContaining([
        {
          totalBets: "1",
          totalEarnings: "1000000000.00",
          totalPoints: "10.00",
          userId: firstMember.id,
          userImage: "https://example.com/first.png",
          userName: "First Ledger Member",
        },
        {
          totalBets: "1",
          totalEarnings: "1000000000.00",
          totalPoints: "10.00",
          userId: secondMember.id,
          userImage: "https://example.com/second.png",
          userName: "Second Ledger Member",
        },
      ]),
      totalBets: 1,
    });

    const vaultBeforeToggle = await withLedger((ledger) =>
      ledger.getVault(createdHero.eventId)
    );
    expect(sortByUserId(vaultBeforeToggle)).toEqual([
      {
        paidOut: false,
        totalEarnings: "1000000000.00",
        userId: firstMember.id,
        userImage: "https://example.com/first.png",
        userName: "First Ledger Member",
      },
      {
        paidOut: false,
        totalEarnings: "1000000000.00",
        userId: secondMember.id,
        userImage: "https://example.com/second.png",
        userName: "Second Ledger Member",
      },
    ]);

    await expect(
      withLedger((ledger) =>
        ledger.togglePaidOut({
          eventId: createdHero.eventId,
          paidOut: true,
          userId: firstMember.id,
        })
      )
    ).resolves.toEqual({ success: true });

    const vaultAfterToggle = await withLedger((ledger) =>
      ledger.getVault(createdHero.eventId)
    );
    expect(
      vaultAfterToggle.find((row) => row.userId === firstMember.id)
    ).toMatchObject({ paidOut: true });
    expect(
      vaultAfterToggle.find((row) => row.userId === secondMember.id)
    ).toMatchObject({ paidOut: false });
  });

  it("refreshes stats and distributed earnings when editing and deleting bets", async () => {
    const creator = await createVerifiedMember({ id: "ledger-edit-admin" });
    const firstMember = await createVerifiedMember({ id: "ledger-edit-first" });
    const secondMember = await createVerifiedMember({
      id: "ledger-edit-second",
    });
    const thirdMember = await createVerifiedMember({ id: "ledger-edit-third" });
    const createdHero = await createHero({ name: "Ledger Edit Hero" });
    const bet = await withLedger((ledger) =>
      ledger.createBet({
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [firstMember.id, secondMember.id],
      })
    );
    await withLedger((ledger) =>
      ledger.distributeGold({
        goldAmount: 2_000_000_000,
        heroId: createdHero.id,
      })
    );

    await expect(
      withLedger((ledger) =>
        ledger.editBet({
          betId: bet.id,
          newUserIds: [secondMember.id, thirdMember.id],
        })
      )
    ).resolves.toEqual({ success: true });

    const editedMembers = await withLedger((ledger) =>
      ledger.getBetMembers(bet.id)
    );
    expect(sortByUserId(editedMembers)).toEqual([
      { id: expect.any(Number), points: "10.00", userId: secondMember.id },
      { id: expect.any(Number), points: "10.00", userId: thirdMember.id },
    ]);

    const editedStats = await testDb
      .select({
        bets: userStats.bets,
        earnings: userStats.earnings,
        points: userStats.points,
        userId: userStats.userId,
      })
      .from(userStats)
      .where(eq(userStats.heroId, createdHero.id));
    expect(sortByUserId(editedStats)).toEqual([
      { bets: 0, earnings: "0.00", points: "0.00", userId: firstMember.id },
      {
        bets: 1,
        earnings: "1000000000.00",
        points: "10.00",
        userId: secondMember.id,
      },
      {
        bets: 1,
        earnings: "1000000000.00",
        points: "10.00",
        userId: thirdMember.id,
      },
    ]);

    await expect(
      withLedger((ledger) => ledger.deleteBet(bet.id))
    ).resolves.toEqual({
      success: true,
    });

    const remainingMembers = await testDb
      .select({ id: heroBetMember.id })
      .from(heroBetMember)
      .where(eq(heroBetMember.heroBetId, bet.id));
    expect(remainingMembers).toEqual([]);

    const deletedStats = await testDb
      .select({
        bets: userStats.bets,
        earnings: userStats.earnings,
        points: userStats.points,
        userId: userStats.userId,
      })
      .from(userStats)
      .where(eq(userStats.heroId, createdHero.id));
    expect(sortByUserId(deletedStats)).toEqual([
      { bets: 0, earnings: "0.00", points: "0.00", userId: firstMember.id },
      { bets: 0, earnings: "0.00", points: "0.00", userId: secondMember.id },
      { bets: 0, earnings: "0.00", points: "0.00", userId: thirdMember.id },
    ]);
  });

  it("returns paginated bet row shapes with attached member rows", async () => {
    vi.useFakeTimers();
    const creator = await createVerifiedMember({
      id: "ledger-page-admin",
      image: "https://example.com/admin.png",
      name: "Ledger Admin",
    });
    const member = await createVerifiedMember({
      id: "ledger-page-member",
      image: "https://example.com/member.png",
      name: "Ledger Page Member",
    });
    const createdHero = await createHero({
      image: "https://example.com/hero.png",
      level: 321,
      name: "Ledger Page Hero",
    });

    vi.setSystemTime(new Date("2026-07-05T09:00:00.000Z"));
    const olderBet = await withLedger((ledger) =>
      ledger.createBet({
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [member.id],
      })
    );
    vi.setSystemTime(new Date("2026-07-05T10:00:00.000Z"));
    const newerBet = await withLedger((ledger) =>
      ledger.createBet({
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [member.id],
      })
    );

    const page = await withLedger((ledger) =>
      ledger.getPaginatedBets({
        eventId: createdHero.eventId,
        limit: 1,
        page: 1,
      })
    );

    expect(page).toEqual({
      items: [
        {
          createdAt: new Date("2026-07-05T10:00:00.000Z"),
          createdBy: creator.id,
          createdByImage: "https://example.com/admin.png",
          createdByName: "Ledger Admin",
          eventId: createdHero.eventId,
          heroId: createdHero.id,
          heroImage: "https://example.com/hero.png",
          heroLevel: 321,
          heroName: "Ledger Page Hero",
          id: newerBet.id,
          memberCount: 1,
          members: [
            {
              heroBetId: newerBet.id,
              points: "20.00",
              userId: member.id,
              userImage: "https://example.com/member.png",
              userName: "Ledger Page Member",
            },
          ],
        },
      ],
      pagination: {
        hasMore: true,
        limit: 1,
        page: 1,
        totalItems: 2,
        totalPages: 2,
      },
    });

    const latestBet = await withLedger((ledger) =>
      ledger.getLatestBetForCopy()
    );
    expect(latestBet).toEqual({
      id: newerBet.id,
      members: [
        {
          heroBetId: newerBet.id,
          points: "20.00",
          userId: member.id,
          userImage: "https://example.com/member.png",
          userName: "Ledger Page Member",
        },
      ],
    });

    const secondPage = await withLedger((ledger) =>
      ledger.getPaginatedBets({
        eventId: createdHero.eventId,
        limit: 1,
        page: 2,
      })
    );
    expect(secondPage.items[0]?.id).toBe(olderBet.id);
    expect(secondPage.pagination.hasMore).toBe(false);
  });
});
