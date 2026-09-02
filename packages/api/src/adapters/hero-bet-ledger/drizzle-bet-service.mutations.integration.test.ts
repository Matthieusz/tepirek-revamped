import { expect, it as effectIt } from "@effect/vitest";
import {
  hero,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import { event } from "@tepirek-revamped/db/schema/event";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";

import { testDb } from "../../test/integration/database.ts";
import {
  createHero,
  createVerifiedMember,
  expectLedgerError,
  sortByUserId,
  testLayer,
  withServices,
} from "./drizzle-bet-service.integration-test-kit.ts";

const createTestEvent = async (endTime: Date) => {
  const [createdEvent] = await testDb
    .insert(event)
    .values({
      color: "#22c55e",
      endTime,
      icon: "calendar",
      name: "Oldest Unpaid Event Test",
    })
    .returning();

  if (!createdEvent) {
    throw new Error("Failed to create test event");
  }

  return createdEvent;
};

effectIt.layer(testLayer)("HeroBetLedger mutation behavior", (it) => {
  it.effect(
    "does not combine different users' earnings when selecting an unpaid event",
    () =>
      Effect.gen(function* testEffect() {
        const creator = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "ledger-oldest-split-admin" })
        );
        const firstMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "ledger-oldest-split-first" })
        );
        const secondMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "ledger-oldest-split-second" })
        );
        const createdHero = yield* Effect.promise(
          async () => await createHero({ name: "Ledger Oldest Split Hero" })
        );

        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: createdHero.id,
            userIds: [firstMember.id, secondMember.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 120_000_000,
            heroId: createdHero.id,
          })
        );

        const vault = yield* withServices((ledger) =>
          ledger.getVault(createdHero.eventId)
        );
        const oldestUnpaidEvent = yield* withServices((ledger) =>
          ledger.getOldestUnpaidEvent()
        );

        expect(vault).toEqual([]);
        expect(oldestUnpaidEvent).toBeNull();
      })
  );

  it.effect(
    "combines paid and unpaid hero rows for one user when selecting an event",
    () =>
      Effect.gen(function* testEffect() {
        const creator = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "ledger-oldest-combined-admin" })
        );
        const member = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "ledger-oldest-combined-member" })
        );
        const firstHero = yield* Effect.promise(
          async () => await createHero({ name: "Ledger Oldest Combined First" })
        );
        const secondHero = yield* Effect.promise(
          async () =>
            await createHero({
              eventId: firstHero.eventId,
              name: "Ledger Oldest Combined Second",
            })
        );

        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: firstHero.id,
            userIds: [member.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 80_000_000,
            heroId: firstHero.id,
          })
        );
        yield* withServices((ledger) =>
          ledger.togglePaidOut({
            eventId: firstHero.eventId,
            paidOut: true,
            userId: member.id,
          })
        );
        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: secondHero.id,
            userIds: [member.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 30_000_000,
            heroId: secondHero.id,
          })
        );

        const vault = yield* withServices((ledger) =>
          ledger.getVault(firstHero.eventId)
        );
        const oldestUnpaidEvent = yield* withServices((ledger) =>
          ledger.getOldestUnpaidEvent()
        );

        expect(vault).toEqual([
          {
            paidOut: false,
            totalEarnings: "110000000.00",
            userId: member.id,
            userImage: null,
            userName: "Test User",
          },
        ]);
        expect(oldestUnpaidEvent).toBe(firstHero.eventId);
      })
  );

  it.effect(
    "selects the oldest eligible event and breaks end-time ties by event ID",
    () =>
      Effect.gen(function* testEffect() {
        const creator = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "ledger-oldest-order-admin" })
        );
        const member = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "ledger-oldest-order-member" })
        );
        const olderEvent = yield* Effect.promise(
          async () =>
            await createTestEvent(new Date("2030-01-01T00:00:00.000Z"))
        );
        const newerEvent = yield* Effect.promise(
          async () =>
            await createTestEvent(new Date("2030-01-02T00:00:00.000Z"))
        );
        const olderHero = yield* Effect.promise(
          async () => await createHero({ eventId: olderEvent.id })
        );
        const newerHero = yield* Effect.promise(
          async () => await createHero({ eventId: newerEvent.id })
        );

        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: olderHero.id,
            userIds: [member.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 100_000_000,
            heroId: olderHero.id,
          })
        );
        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: newerHero.id,
            userIds: [member.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 100_000_000,
            heroId: newerHero.id,
          })
        );

        const oldestUnpaidEvent = yield* withServices((ledger) =>
          ledger.getOldestUnpaidEvent()
        );
        expect(oldestUnpaidEvent).toBe(olderEvent.id);

        yield* withServices((ledger) =>
          ledger.togglePaidOut({
            eventId: olderEvent.id,
            paidOut: true,
            userId: member.id,
          })
        );
        yield* withServices((ledger) =>
          ledger.togglePaidOut({
            eventId: newerEvent.id,
            paidOut: true,
            userId: member.id,
          })
        );

        const tiedEndTime = new Date("2030-01-03T00:00:00.000Z");
        const firstTiedEvent = yield* Effect.promise(
          async () => await createTestEvent(tiedEndTime)
        );
        const secondTiedEvent = yield* Effect.promise(
          async () => await createTestEvent(tiedEndTime)
        );
        const firstTiedHero = yield* Effect.promise(
          async () => await createHero({ eventId: firstTiedEvent.id })
        );
        const secondTiedHero = yield* Effect.promise(
          async () => await createHero({ eventId: secondTiedEvent.id })
        );

        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: firstTiedHero.id,
            userIds: [member.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 100_000_000,
            heroId: firstTiedHero.id,
          })
        );
        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: secondTiedHero.id,
            userIds: [member.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 100_000_000,
            heroId: secondTiedHero.id,
          })
        );

        const tiedOldestUnpaidEvent = yield* withServices((ledger) =>
          ledger.getOldestUnpaidEvent()
        );
        expect(tiedOldestUnpaidEvent).toBe(firstTiedEvent.id);
      })
  );

  it.effect(
    "creates a bet with internally timestamped raw bet rows and per-member stats",
    () =>
      Effect.gen(function* testEffect() {
        const creationTime = new Date("2026-07-05T10:11:12.000Z");

        const creator = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-create-admin" })
        );
        const firstMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-create-first",
            })
        );
        const secondMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-create-second",
            })
        );
        const thirdMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-create-third",
            })
        );
        const createdHero = yield* Effect.promise(
          async () => await createHero({ name: "Ledger Create Hero" })
        );

        const bet = yield* withServices(
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

        const members = yield* withServices((ledger) =>
          ledger.getBetMembers(bet.id)
        );
        expect(members.every((member) => Number.isInteger(member.id))).toBe(
          true
        );
        expect(sortByUserId(members)).toMatchObject([
          { points: "6.66", userId: firstMember.id },
          { points: "6.66", userId: secondMember.id },
          { points: "6.66", userId: thirdMember.id },
        ]);

        const stats = yield* Effect.promise(() =>
          testDb
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
            .where(eq(userStats.heroId, createdHero.id))
        );

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
      })
  );

  it.effect(
    "returns typed ledger errors for validation and not-found failures",
    () =>
      Effect.gen(function* testEffect() {
        const creator = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-errors-admin" })
        );
        const member = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-errors-member" })
        );
        const createdHero = yield* Effect.promise(
          async () => await createHero({ name: "Ledger Errors Hero" })
        );

        yield* expectLedgerError(
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

        yield* expectLedgerError(
          withServices((ledger) =>
            ledger.createBet({
              createdAt: new Date(0),
              createdBy: creator.id,
              heroId: createdHero.id,
              userIds: ["ledger-errors-unverified"],
            })
          ),
          "BetBadRequest",
          "Wybierz tylko zweryfikowanych graczy"
        );

        yield* expectLedgerError(
          withServices((ledger) => ledger.deleteBet(123_456)),
          "BetNotFound",
          "Obstawienie nie znalezione"
        );

        yield* expectLedgerError(
          withServices((ledger) => ledger.getHeroStats(123_456)),
          "RankingNotFound",
          "Heros nie znaleziony"
        );
      })
  );

  it.effect(
    "distributes gold into point worth, rankings, vault rows, and paid-out toggles",
    () =>
      Effect.gen(function* testEffect() {
        const creator = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-dist-admin" })
        );
        const firstMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-dist-first",
              image: "https://example.com/first.png",
              name: "First Ledger Member",
            })
        );
        const secondMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-dist-second",
              image: "https://example.com/second.png",
              name: "Second Ledger Member",
            })
        );
        const createdHero = yield* Effect.promise(
          async () => await createHero({ name: "Ledger Distribution Hero" })
        );
        yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: createdHero.id,
            userIds: [firstMember.id, secondMember.id],
          })
        );

        const distribution = yield* withServices((ledger) =>
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

        const [heroStats] = yield* Effect.promise(() =>
          testDb
            .select({ pointWorth: hero.pointWorth })
            .from(hero)
            .where(eq(hero.id, createdHero.id))
        );
        expect(heroStats).toEqual({ pointWorth: "100000000.000000" });

        const ranking = yield* withServices((ledger) =>
          ledger.getRanking({ heroId: createdHero.id })
        );
        expect(ranking.pointWorth).toBe(100_000_000);
        expect(ranking.totalBets).toBe(1);
        expect(ranking.ranking).toEqual(
          expect.arrayContaining([
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
          ])
        );

        const vaultBeforeToggle = yield* withServices((ledger) =>
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

        const toggleResult = yield* withServices((ledger) =>
          ledger.togglePaidOut({
            eventId: createdHero.eventId,
            paidOut: true,
            userId: firstMember.id,
          })
        );
        expect(toggleResult).toEqual({ success: true });

        const vaultAfterToggle = yield* withServices((ledger) =>
          ledger.getVault(createdHero.eventId)
        );
        expect(
          vaultAfterToggle.find((row) => row.userId === firstMember.id)
        ).toMatchObject({ paidOut: true });
        expect(
          vaultAfterToggle.find((row) => row.userId === secondMember.id)
        ).toMatchObject({ paidOut: false });
      })
  );

  it.effect(
    "refreshes stats and distributed earnings when editing and deleting bets",
    () =>
      Effect.gen(function* testEffect() {
        const creator = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-edit-admin" })
        );
        const firstMember = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-edit-first" })
        );
        const secondMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-edit-second",
            })
        );
        const thirdMember = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-edit-third" })
        );
        const createdHero = yield* Effect.promise(
          async () => await createHero({ name: "Ledger Edit Hero" })
        );
        const bet = yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: createdHero.id,
            userIds: [firstMember.id, secondMember.id],
          })
        );
        yield* withServices((ledger) =>
          ledger.distributeGold({
            goldAmount: 2_000_000_000,
            heroId: createdHero.id,
          })
        );

        const editResult = yield* withServices((ledger) =>
          ledger.editBet({
            betId: bet.id,
            newUserIds: [secondMember.id, thirdMember.id],
          })
        );
        expect(editResult).toEqual({ success: true });

        const editedMembers = yield* withServices((ledger) =>
          ledger.getBetMembers(bet.id)
        );
        expect(
          editedMembers.every((member) => Number.isInteger(member.id))
        ).toBe(true);
        expect(sortByUserId(editedMembers)).toMatchObject([
          { points: "10.00", userId: secondMember.id },
          { points: "10.00", userId: thirdMember.id },
        ]);

        const editedStats = yield* Effect.promise(() =>
          testDb
            .select({
              bets: userStats.bets,
              earnings: userStats.earnings,
              points: userStats.points,
              userId: userStats.userId,
            })
            .from(userStats)
            .where(eq(userStats.heroId, createdHero.id))
        );
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

        const deleteResult = yield* withServices((ledger) =>
          ledger.deleteBet(bet.id)
        );
        expect(deleteResult).toEqual({ success: true });

        const remainingMembers = yield* Effect.promise(() =>
          testDb
            .select({ id: heroBetMember.id })
            .from(heroBetMember)
            .where(eq(heroBetMember.heroBetId, bet.id))
        );
        expect(remainingMembers).toEqual([]);

        const deletedStats = yield* Effect.promise(() =>
          testDb
            .select({
              bets: userStats.bets,
              earnings: userStats.earnings,
              points: userStats.points,
              userId: userStats.userId,
            })
            .from(userStats)
            .where(eq(userStats.heroId, createdHero.id))
        );
        expect(sortByUserId(deletedStats)).toEqual([
          { bets: 0, earnings: "0.00", points: "0.00", userId: firstMember.id },
          {
            bets: 0,
            earnings: "0.00",
            points: "0.00",
            userId: secondMember.id,
          },
          { bets: 0, earnings: "0.00", points: "0.00", userId: thirdMember.id },
        ]);
      })
  );
});
