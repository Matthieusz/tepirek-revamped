import { expect, it as effectIt } from "@effect/vitest";
import {
  hero,
  heroBet,
  heroBetMember,
  userStats,
} from "@tepirek-revamped/db/schema/bet";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import { testDb } from "../../test/integration/database.ts";
import {
  createHero,
  createVerifiedMember,
  testLayer,
  withServices,
} from "./drizzle-bet-service.integration-test-kit.ts";

const assertHeroLedgerInvariant = (heroId: number) =>
  Effect.gen(function* testEffect() {
    const members = yield* Effect.promise(() =>
      testDb
        .select({
          points: heroBetMember.points,
          userId: heroBetMember.userId,
        })
        .from(heroBetMember)
        .innerJoin(heroBet, eq(heroBetMember.heroBetId, heroBet.id))
        .where(eq(heroBet.heroId, heroId))
    );
    let expected = HashMap.empty<string, { bets: number; points: number }>();
    for (const member of members) {
      const current = HashMap.get(expected, member.userId).pipe(
        Option.getOrElse(() => ({ bets: 0, points: 0 }))
      );
      expected = HashMap.set(expected, member.userId, {
        bets: current.bets + 1,
        points: current.points + Number(member.points),
      });
    }

    const [heroRow] = yield* Effect.promise(() =>
      testDb
        .select({ pointWorth: hero.pointWorth })
        .from(hero)
        .where(eq(hero.id, heroId))
    );
    const stats = yield* Effect.promise(() =>
      testDb
        .select({
          bets: userStats.bets,
          earnings: userStats.earnings,
          points: userStats.points,
          userId: userStats.userId,
        })
        .from(userStats)
        .where(eq(userStats.heroId, heroId))
    );

    for (const stat of stats) {
      const expectedStat = HashMap.get(expected, stat.userId).pipe(
        Option.getOrElse(() => ({ bets: 0, points: 0 }))
      );
      expect(stat.bets).toBe(expectedStat.bets);
      expect(Number(stat.points)).toBeCloseTo(expectedStat.points, 2);
      const expectedEarnings =
        Math.round(
          expectedStat.points * Number(heroRow?.pointWorth ?? 0) * 100
        ) / 100;
      expect(Number(stat.earnings)).toBeCloseTo(expectedEarnings, 2);
    }
  });

effectIt.layer(testLayer)("HeroBetLedger concurrency and invariants", (it) => {
  it.effect("keeps deletion and distribution coherent when they overlap", () =>
    Effect.gen(function* testEffect() {
      const creator = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-delete-overlap-admin",
          })
      );
      const member = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-delete-overlap-member",
          })
      );
      const createdHero = yield* Effect.promise(
        async () =>
          await createHero({
            name: "Ledger Delete Overlap Hero",
          })
      );
      const bet = yield* withServices((ledger) =>
        ledger.createBet({
          createdAt: new Date(0),
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [member.id],
        })
      );

      const outcomes = yield* Effect.all(
        [
          withServices((ledger) => ledger.deleteBet(bet.id)).pipe(Effect.exit),
          withServices((ledger) =>
            ledger.distributeGold({ goldAmount: 1000, heroId: createdHero.id })
          ).pipe(Effect.exit),
        ],
        { concurrency: "unbounded" }
      );

      expect(outcomes).toHaveLength(2);
      yield* assertHeroLedgerInvariant(createdHero.id);
    })
  );

  it.effect("does not mix aggregate rows across overlapping edits", () =>
    Effect.gen(function* testEffect() {
      const creator = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-two-edits-admin",
          })
      );
      const firstMember = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-two-edits-first",
          })
      );
      const secondMember = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-two-edits-second",
          })
      );
      const thirdMember = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-two-edits-third",
          })
      );
      const fourthMember = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-two-edits-fourth",
          })
      );
      const createdHero = yield* Effect.promise(
        async () => await createHero({ name: "Ledger Two Edits Hero" })
      );
      const bet = yield* withServices((ledger) =>
        ledger.createBet({
          createdAt: new Date(0),
          createdBy: creator.id,
          heroId: createdHero.id,
          userIds: [firstMember.id, secondMember.id],
        })
      );

      yield* Effect.all(
        [
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
        ],
        { concurrency: "unbounded" }
      );

      const members = yield* withServices((ledger) =>
        ledger.getBetMembers(bet.id)
      );
      const memberIds = members.map((row) => row.userId).toSorted();
      expect([
        [firstMember.id, thirdMember.id].toSorted(),
        [secondMember.id, fourthMember.id].toSorted(),
      ]).toContainEqual(memberIds);
      yield* assertHeroLedgerInvariant(createdHero.id);
    })
  );

  it.effect("allows independent hero ledgers to mutate concurrently", () =>
    Effect.gen(function* testEffect() {
      const creator = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-independent-admin",
          })
      );
      const firstMember = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-independent-first",
          })
      );
      const secondMember = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-independent-second",
          })
      );
      const firstHero = yield* Effect.promise(
        async () => await createHero({ name: "Ledger Independent First" })
      );
      const secondHero = yield* Effect.promise(
        async () => await createHero({ name: "Ledger Independent Second" })
      );

      yield* Effect.all(
        [
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
        ],
        { concurrency: "unbounded" }
      );

      const distributions = yield* Effect.all(
        [
          withServices((ledger) =>
            ledger.distributeGold({ goldAmount: 1000, heroId: firstHero.id })
          ),
          withServices((ledger) =>
            ledger.distributeGold({ goldAmount: 2000, heroId: secondHero.id })
          ),
        ],
        { concurrency: "unbounded" }
      );

      expect(distributions).toHaveLength(2);
      yield* assertHeroLedgerInvariant(firstHero.id);
      yield* assertHeroLedgerInvariant(secondHero.id);
    })
  );
  it.effect(
    "keeps edit and distribution mutations coherent when they overlap",
    () =>
      Effect.gen(function* testEffect() {
        const creator = yield* Effect.promise(
          async () => await createVerifiedMember({ id: "ledger-overlap-admin" })
        );
        const firstMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-overlap-first",
            })
        );
        const secondMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-overlap-second",
            })
        );
        const thirdMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "ledger-overlap-third",
            })
        );
        const createdHero = yield* Effect.promise(
          async () => await createHero({ name: "Ledger Overlap Hero" })
        );
        const bet = yield* withServices((ledger) =>
          ledger.createBet({
            createdAt: new Date(0),
            createdBy: creator.id,
            heroId: createdHero.id,
            userIds: [firstMember.id, secondMember.id],
          })
        );

        const results = yield* Effect.all(
          [
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
          ],
          { concurrency: "unbounded" }
        );

        expect(results).toHaveLength(2);
        yield* assertHeroLedgerInvariant(createdHero.id);
      })
  );
});
