import { expect, it as effectIt } from "@effect/vitest";
import * as Effect from "effect/Effect";

import {
  createHero,
  createVerifiedMember,
  testLayer,
  withServices,
} from "./drizzle-bet-service.integration-test-kit.ts";

effectIt.layer(testLayer)("HeroBetLedger read models and pagination", (it) => {
  it.effect("returns paginated bet row shapes with attached member rows", () =>
    Effect.gen(function* testEffect() {
      const creator = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-page-admin",
            image: "https://example.com/admin.png",
            name: "Ledger Admin",
          })
      );
      const member = yield* Effect.promise(
        async () =>
          await createVerifiedMember({
            id: "ledger-page-member",
            image: "https://example.com/member.png",
            name: "Ledger Page Member",
          })
      );
      const createdHero = yield* Effect.promise(
        async () =>
          await createHero({
            image: "https://example.com/hero.png",
            level: 321,
            name: "Ledger Page Hero",
          })
      );

      const olderBet = yield* withServices(
        (ledger) =>
          ledger.createBet({
            createdAt: new Date("2026-07-05T09:00:00.000Z"),
            createdBy: creator.id,
            heroId: createdHero.id,
            userIds: [member.id],
          }),
        new Date("2026-07-05T09:00:00.000Z")
      );
      const newerBet = yield* withServices(
        (ledger) =>
          ledger.createBet({
            createdAt: new Date("2026-07-05T10:00:00.000Z"),
            createdBy: creator.id,
            heroId: createdHero.id,
            userIds: [member.id],
          }),
        new Date("2026-07-05T10:00:00.000Z")
      );

      const page = yield* withServices((ledger) =>
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

      const latestBet = yield* withServices((ledger) =>
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

      const secondPage = yield* withServices((ledger) =>
        ledger.getPaginatedBets({
          eventId: createdHero.eventId,
          limit: 1,
          page: 2,
        })
      );
      expect(secondPage.items[0]?.id).toBe(olderBet.id);
      expect(secondPage.pagination.hasMore).toBe(false);
    })
  );
});
