import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import {
  hero,
  heroBet,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";
import { describe, expect, it } from "vitest";

import type { BetServiceInterface } from "../../services/bet/bet-service.ts";
import { BetService } from "../../services/bet/bet-service.ts";
import type { RankingServiceInterface } from "../../services/ranking/ranking-service.ts";
import { RankingService } from "../../services/ranking/ranking-service.ts";
import type { VaultServiceInterface } from "../../services/vault/vault-service.ts";
import { VaultService } from "../../services/vault/vault-service.ts";
import { testEffect } from "../../test/effect.ts";
import {
  createHero,
  createVerifiedMember,
} from "../../test/integration/builders.ts";
import {
  defaultTestDatabaseUrl,
  testDb,
} from "../../test/integration/database.ts";
import { DrizzleBetServiceLayer } from "./drizzle-bet-service.ts";
import { DrizzleRankingServiceLayer } from "./drizzle-ranking-service.ts";
import { DrizzleVaultServiceLayer } from "./drizzle-vault-service.ts";

const sortByUserId = <T extends { userId: string }>(rows: readonly T[]) =>
  (rows as T[]).toSorted((left, right) =>
    left.userId.localeCompare(right.userId)
  );

const databaseLayer = makeLiveDatabaseLayer(defaultTestDatabaseUrl);
const testLayer = Layer.mergeAll(
  DrizzleBetServiceLayer.pipe(Layer.provide(databaseLayer)),
  DrizzleRankingServiceLayer.pipe(Layer.provide(databaseLayer)),
  DrizzleVaultServiceLayer.pipe(Layer.provide(databaseLayer))
);

const withServices = <A>(
  f: (svc: {
    readonly createBet: BetServiceInterface["createBet"];
    readonly deleteBet: BetServiceInterface["deleteBet"];
    readonly editBet: BetServiceInterface["editBet"];
    readonly getAllBets: BetServiceInterface["getAllBets"];
    readonly getPaginatedBets: BetServiceInterface["getPaginatedBets"];
    readonly getBetMembers: BetServiceInterface["getBetMembers"];
    readonly getBetsByEvent: BetServiceInterface["getBetsByEvent"];
    readonly getLatestBetForCopy: BetServiceInterface["getLatestBetForCopy"];
    readonly getHeroStats: RankingServiceInterface["getHeroStats"];
    readonly getOldestUnpaidEvent: RankingServiceInterface["getOldestUnpaidEvent"];
    readonly getRanking: RankingServiceInterface["getRanking"];
    readonly distributeGold: VaultServiceInterface["distributeGold"];
    readonly getUserStats: VaultServiceInterface["getUserStats"];
    readonly getVault: VaultServiceInterface["getVault"];
    readonly togglePaidOut: VaultServiceInterface["togglePaidOut"];
  }) => Effect.Effect<A, unknown>,
  currentTime?: Date
) =>
  testEffect(
    testLayer,
    Effect.gen(function* provideServices() {
      if (currentTime !== undefined) {
        yield* TestClock.setTime(currentTime.getTime());
      }
      const bet = yield* BetService;
      const ranking = yield* RankingService;
      const vault = yield* VaultService;
      return yield* f({
        ...bet,
        ...ranking,
        ...vault,
      });
    })
  );

const expectLedgerError = async (
  action: Promise<unknown>,
  tag: string,
  message: string
) => {
  await expect(action).rejects.toMatchObject({ _tag: tag, message });
};

const assertHeroLedgerInvariant = async (heroId: number) => {
  const members = await testDb
    .select({
      points: heroBetMember.points,
      userId: heroBetMember.userId,
    })
    .from(heroBetMember)
    .innerJoin(heroBet, eq(heroBetMember.heroBetId, heroBet.id))
    .where(eq(heroBet.heroId, heroId));
  const expected = new Map<string, { bets: number; points: number }>();
  for (const member of members) {
    const current = expected.get(member.userId) ?? { bets: 0, points: 0 };
    current.bets += 1;
    current.points += Number(member.points);
    expected.set(member.userId, current);
  }

  const [heroRow] = await testDb
    .select({ pointWorth: hero.pointWorth })
    .from(hero)
    .where(eq(hero.id, heroId));
  const stats = await testDb
    .select({
      bets: userStats.bets,
      earnings: userStats.earnings,
      points: userStats.points,
      userId: userStats.userId,
    })
    .from(userStats)
    .where(eq(userStats.heroId, heroId));

  for (const stat of stats) {
    const expectedStat = expected.get(stat.userId) ?? { bets: 0, points: 0 };
    expect(stat.bets).toBe(expectedStat.bets);
    expect(Number(stat.points)).toBeCloseTo(expectedStat.points, 2);
    const expectedEarnings =
      Math.round(expectedStat.points * Number(heroRow?.pointWorth ?? 0) * 100) /
      100;
    expect(Number(stat.earnings)).toBeCloseTo(expectedEarnings, 2);
  }
};

describe("HeroBetLedger characterization", () => {
  it("creates a bet with internally timestamped raw bet rows and per-member stats", async () => {
    const creationTime = new Date("2026-07-05T10:11:12.000Z");

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

    const bet = await withServices(
      (ledger) =>
        ledger.createBet({
          createdAt: creationTime,
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [firstMember.id, secondMember.id, thirdMember.id],
        }),
      creationTime
    );

    expect(bet).toMatchObject({
      createdAt: new Date("2026-07-05T10:11:12.000Z"),
      createdBy: creator.id,
      heroId: createdHero.id,
      memberCount: 3,
    });
    expect(bet.id).toEqual(expect.any(Number));

    const members = await withServices((ledger) =>
      ledger.getBetMembers(bet.id)
    );
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
      withServices((ledger) =>
        ledger.createBet({
          createdAt: new Date(0),
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [member.id, member.id],
        })
      ),
      "BetBadRequest",
      "Ten sam gracz nie może być wybrany dwa razy"
    );

    await expectLedgerError(
      withServices((ledger) =>
        ledger.createBet({
          createdAt: new Date(0),
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [""],
        })
      ),
      "BetBadRequest",
      "Wybierz tylko zweryfikowanych graczy"
    );

    await expectLedgerError(
      withServices((ledger) => ledger.deleteBet(123_456)),
      "BetNotFound",
      "Obstawienie nie znalezione"
    );

    await expectLedgerError(
      withServices((ledger) => ledger.getHeroStats(123_456)),
      "RankingNotFound",
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
    await withServices((ledger) =>
      ledger.createBet({
        createdAt: new Date(0),
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [firstMember.id, secondMember.id],
      })
    );

    const distribution = await withServices((ledger) =>
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

    const ranking = await withServices((ledger) =>
      ledger.getRanking({ heroId: createdHero.id })
    );
    expect(ranking).toEqual({
      pointWorth: 100_000_000,
      ranking: expect.arrayContaining([
        {
          totalBets: 1,
          totalEarnings: "1000000000.00",
          totalPoints: "10.00",
          userId: firstMember.id,
          userImage: "https://example.com/first.png",
          userName: "First Ledger Member",
        },
        {
          totalBets: 1,
          totalEarnings: "1000000000.00",
          totalPoints: "10.00",
          userId: secondMember.id,
          userImage: "https://example.com/second.png",
          userName: "Second Ledger Member",
        },
      ]),
      totalBets: 1,
    });

    const vaultBeforeToggle = await withServices((ledger) =>
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
      withServices((ledger) =>
        ledger.togglePaidOut({
          eventId: createdHero.eventId,
          paidOut: true,
          userId: firstMember.id,
        })
      )
    ).resolves.toEqual({ success: true });

    const vaultAfterToggle = await withServices((ledger) =>
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
    const bet = await withServices((ledger) =>
      ledger.createBet({
        createdAt: new Date(0),
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [firstMember.id, secondMember.id],
      })
    );
    await withServices((ledger) =>
      ledger.distributeGold({
        goldAmount: 2_000_000_000,
        heroId: createdHero.id,
      })
    );

    await expect(
      withServices((ledger) =>
        ledger.editBet({
          betId: bet.id,
          newUserIds: [secondMember.id, thirdMember.id],
        })
      )
    ).resolves.toEqual({ success: true });

    const editedMembers = await withServices((ledger) =>
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
      withServices((ledger) => ledger.deleteBet(bet.id))
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

  it("keeps edit and distribution mutations coherent when they overlap", async () => {
    const creator = await createVerifiedMember({ id: "ledger-overlap-admin" });
    const firstMember = await createVerifiedMember({
      id: "ledger-overlap-first",
    });
    const secondMember = await createVerifiedMember({
      id: "ledger-overlap-second",
    });
    const thirdMember = await createVerifiedMember({
      id: "ledger-overlap-third",
    });
    const createdHero = await createHero({ name: "Ledger Overlap Hero" });
    const bet = await withServices((ledger) =>
      ledger.createBet({
        createdAt: new Date(0),
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [firstMember.id, secondMember.id],
      })
    );

    const results = await Promise.all([
      withServices((ledger) =>
        ledger.editBet({
          betId: bet.id,
          newUserIds: [firstMember.id, thirdMember.id],
        })
      ),
      withServices((ledger) =>
        ledger.distributeGold({
          goldAmount: 2_000_000_000,
          heroId: createdHero.id,
        })
      ),
    ]);

    expect(results).toHaveLength(2);
    await assertHeroLedgerInvariant(createdHero.id);
  });

  it("keeps deletion and distribution coherent when they overlap", async () => {
    const creator = await createVerifiedMember({
      id: "ledger-delete-overlap-admin",
    });
    const member = await createVerifiedMember({
      id: "ledger-delete-overlap-member",
    });
    const createdHero = await createHero({
      name: "Ledger Delete Overlap Hero",
    });
    const bet = await withServices((ledger) =>
      ledger.createBet({
        createdAt: new Date(0),
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [member.id],
      })
    );

    const outcomes = await Promise.allSettled([
      withServices((ledger) => ledger.deleteBet(bet.id)),
      withServices((ledger) =>
        ledger.distributeGold({ goldAmount: 1000, heroId: createdHero.id })
      ),
    ]);

    expect(outcomes).toHaveLength(2);
    await assertHeroLedgerInvariant(createdHero.id);
  });

  it("does not mix aggregate rows across overlapping edits", async () => {
    const creator = await createVerifiedMember({
      id: "ledger-two-edits-admin",
    });
    const firstMember = await createVerifiedMember({
      id: "ledger-two-edits-first",
    });
    const secondMember = await createVerifiedMember({
      id: "ledger-two-edits-second",
    });
    const thirdMember = await createVerifiedMember({
      id: "ledger-two-edits-third",
    });
    const fourthMember = await createVerifiedMember({
      id: "ledger-two-edits-fourth",
    });
    const createdHero = await createHero({ name: "Ledger Two Edits Hero" });
    const bet = await withServices((ledger) =>
      ledger.createBet({
        createdAt: new Date(0),
        createdBy: creator.id,
        heroId: createdHero.id,
        userIds: [firstMember.id, secondMember.id],
      })
    );

    await Promise.all([
      withServices((ledger) =>
        ledger.editBet({
          betId: bet.id,
          newUserIds: [firstMember.id, thirdMember.id],
        })
      ),
      withServices((ledger) =>
        ledger.editBet({
          betId: bet.id,
          newUserIds: [secondMember.id, fourthMember.id],
        })
      ),
    ]);

    const members = await withServices((ledger) =>
      ledger.getBetMembers(bet.id)
    );
    const memberIds = members.map((row) => row.userId).toSorted();
    expect([
      [firstMember.id, thirdMember.id].toSorted(),
      [secondMember.id, fourthMember.id].toSorted(),
    ]).toContainEqual(memberIds);
    await assertHeroLedgerInvariant(createdHero.id);
  });

  it("allows independent hero ledgers to mutate concurrently", async () => {
    const creator = await createVerifiedMember({
      id: "ledger-independent-admin",
    });
    const firstMember = await createVerifiedMember({
      id: "ledger-independent-first",
    });
    const secondMember = await createVerifiedMember({
      id: "ledger-independent-second",
    });
    const firstHero = await createHero({ name: "Ledger Independent First" });
    const secondHero = await createHero({ name: "Ledger Independent Second" });

    await Promise.all([
      withServices((ledger) =>
        ledger.createBet({
          createdAt: new Date(0),
          createdBy: creator.id,
          heroId: firstHero.id,
          userIds: [firstMember.id],
        })
      ),
      withServices((ledger) =>
        ledger.createBet({
          createdAt: new Date(0),
          createdBy: creator.id,
          heroId: secondHero.id,
          userIds: [secondMember.id],
        })
      ),
    ]);

    const distributions = await Promise.all([
      withServices((ledger) =>
        ledger.distributeGold({ goldAmount: 1000, heroId: firstHero.id })
      ),
      withServices((ledger) =>
        ledger.distributeGold({ goldAmount: 2000, heroId: secondHero.id })
      ),
    ]);

    expect(distributions).toHaveLength(2);
    await assertHeroLedgerInvariant(firstHero.id);
    await assertHeroLedgerInvariant(secondHero.id);
  });

  it("returns paginated bet row shapes with attached member rows", async () => {
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

    const olderBet = await withServices(
      (ledger) =>
        ledger.createBet({
          createdAt: new Date("2026-07-05T09:00:00.000Z"),
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [member.id],
        }),
      new Date("2026-07-05T09:00:00.000Z")
    );
    const newerBet = await withServices(
      (ledger) =>
        ledger.createBet({
          createdAt: new Date("2026-07-05T10:00:00.000Z"),
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [member.id],
        }),
      new Date("2026-07-05T10:00:00.000Z")
    );

    const page = await withServices((ledger) =>
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

    const latestBet = await withServices((ledger) =>
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

    const secondPage = await withServices((ledger) =>
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
