import { expect, it as effectIt } from "@effect/vitest";
import {
  hero,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
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

effectIt.layer(testLayer)("HeroBetLedger mutation behavior", (it) => {
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
        expect(sortByUserId(members)).toEqual([
          { id: expect.any(Number), points: "6.66", userId: firstMember.id },
          { id: expect.any(Number), points: "6.66", userId: secondMember.id },
          { id: expect.any(Number), points: "6.66", userId: thirdMember.id },
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
        expect(sortByUserId(editedMembers)).toEqual([
          { id: expect.any(Number), points: "10.00", userId: secondMember.id },
          { id: expect.any(Number), points: "10.00", userId: thirdMember.id },
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
