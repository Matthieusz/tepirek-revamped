import { expect, it as effectIt } from "@effect/vitest";
import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";

import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import { createVerifiedMember } from "../../../test/integration/builders.ts";
import { testDb } from "../../../test/integration/database.ts";
import {
  parseTestAccountId,
  parseTestCredits,
  parseTestProfileId,
  parseTestUserId,
  squadBuilderIntegrationTestLayer,
} from "../../../test/squad-builder/store-integration.ts";
import {
  respond,
  revoke,
} from "../account-sharing/account-sharing-operations.ts";
import { AccountSharingStoreService } from "../account-sharing/account-sharing-store.ts";
import { listAccountAccessGrants } from "../account-sharing/list-account-access-grants.ts";
import { search } from "../account-sharing/search-account-invite-targets-service.ts";
import { send } from "../account-sharing/send-account-access-invite-service.ts";
import { FirecrawlRequestAccountingStoreService } from "../firecrawl-request-accounting-store.ts";

effectIt.layer(squadBuilderIntegrationTestLayer, { excludeTestServices: true })(
  "Drizzle account sharing and Firecrawl accounting integration",
  (it) => {
    it.effect(
      "reserves and completes Firecrawl requests through the Effect store",
      () =>
        Effect.gen(function* testEffect() {
          const member = yield* Effect.promise(
            async () =>
              await createVerifiedMember({ id: "effect-firecrawl-user" })
          );
          const profileId = parseTestProfileId(8_100_201);
          const yearMonth = firecrawlYearMonthFromDate(
            new Date("2026-06-29T12:00:00.000Z")
          );

          const reserved = yield* FirecrawlRequestAccountingStoreService.use(
            (store) =>
              store.reserveRequest({
                monthlyRequestBudget: 10,
                perUserMonthlyRequestBudget: 10,
                profileId,
                requestedByUserId: parseTestUserId(member.id),
                yearMonth,
              })
          );

          yield* FirecrawlRequestAccountingStoreService.use((store) =>
            store.markRequestSucceeded({
              cacheState: "hit",
              completedAt: new Date("2026-06-29T12:00:00.000Z"),
              creditsUsed: parseTestCredits(1),
              firecrawlStatusCode: 200,
              requestId: reserved.requestId,
            })
          );

          const [stored] = yield* Effect.promise(() =>
            testDb
              .select({
                cacheState: firecrawlProfileScrapeRequest.cacheState,
                creditsUsed: firecrawlProfileScrapeRequest.creditsUsed,
                firecrawlStatusCode:
                  firecrawlProfileScrapeRequest.firecrawlStatusCode,
                status: firecrawlProfileScrapeRequest.status,
              })
              .from(firecrawlProfileScrapeRequest)
              .where(eq(firecrawlProfileScrapeRequest.id, reserved.requestId))
              .limit(1)
          );

          expect(stored).toEqual({
            cacheState: "hit",
            creditsUsed: 1,
            firecrawlStatusCode: 200,
            status: "succeeded",
          });
        })
    );

    it.effect("enforces the per-user Firecrawl budget", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "effect-firecrawl-budget-user" })
        );
        const store = yield* FirecrawlRequestAccountingStoreService;
        const input = {
          monthlyRequestBudget: 10,
          perUserMonthlyRequestBudget: 2,
          requestedByUserId: parseTestUserId(member.id),
          yearMonth: firecrawlYearMonthFromDate(
            new Date("2026-07-01T12:00:00.000Z")
          ),
        } as const;

        yield* store.reserveRequest(input);
        yield* store.reserveRequest(input);
        const failure = yield* Effect.flip(store.reserveRequest(input));

        expect(failure).toMatchObject({
          _tag: "FirecrawlUserMonthlyBudgetExhausted",
          monthlyRequestBudget: 2,
          usedRequests: 2,
          yearMonth: "2026-07",
        });
      })
    );

    it.effect("isolates per-user Firecrawl budgets", () =>
      Effect.gen(function* testEffect() {
        const firstMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "effect-firecrawl-budget-first" })
        );
        const secondMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "effect-firecrawl-budget-second" })
        );
        const store = yield* FirecrawlRequestAccountingStoreService;
        const yearMonth = firecrawlYearMonthFromDate(
          new Date("2026-08-01T12:00:00.000Z")
        );
        const reserve = (userId: string, profileId: number) =>
          store.reserveRequest({
            monthlyRequestBudget: 10,
            perUserMonthlyRequestBudget: 1,
            profileId: parseTestProfileId(profileId),
            requestedByUserId: parseTestUserId(userId),
            yearMonth,
          });

        yield* reserve(firstMember.id, 8_100_210);
        const firstUserFailure = yield* Effect.flip(
          reserve(firstMember.id, 8_100_211)
        );
        const secondUserReservation = yield* reserve(
          secondMember.id,
          8_100_212
        );

        expect(firstUserFailure._tag).toBe(
          "FirecrawlUserMonthlyBudgetExhausted"
        );
        expect(secondUserReservation.budgetState.usedRequests).toBe(2);
      })
    );

    it.effect("keeps global exhaustion ahead of per-user exhaustion", () =>
      Effect.gen(function* testEffect() {
        const firstMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "effect-firecrawl-global-first" })
        );
        const secondMember = yield* Effect.promise(
          async () =>
            await createVerifiedMember({ id: "effect-firecrawl-global-second" })
        );
        const store = yield* FirecrawlRequestAccountingStoreService;
        const yearMonth = firecrawlYearMonthFromDate(
          new Date("2026-09-01T12:00:00.000Z")
        );
        const reserve = (userId: string, profileId: number) =>
          store.reserveRequest({
            monthlyRequestBudget: 1,
            perUserMonthlyRequestBudget: 10,
            profileId: parseTestProfileId(profileId),
            requestedByUserId: parseTestUserId(userId),
            yearMonth,
          });

        yield* reserve(firstMember.id, 8_100_220);
        const secondUserFailure = yield* Effect.flip(
          reserve(secondMember.id, 8_100_221)
        );
        const firstUserFailure = yield* Effect.flip(
          reserve(firstMember.id, 8_100_222)
        );

        expect(secondUserFailure).toMatchObject({
          _tag: "FirecrawlMonthlyBudgetExhausted",
          monthlyRequestBudget: 1,
          usedRequests: 1,
        });
        expect(firstUserFailure._tag).toBe("FirecrawlMonthlyBudgetExhausted");
      })
    );

    it.effect("does not overshoot a concurrent per-user budget", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-firecrawl-concurrent-user",
            })
        );
        const store = yield* FirecrawlRequestAccountingStoreService;
        const yearMonth = firecrawlYearMonthFromDate(
          new Date("2026-10-01T12:00:00.000Z")
        );
        const outcomes = yield* Effect.all(
          Array.from({ length: 6 }, (_, index) =>
            Effect.exit(
              store.reserveRequest({
                monthlyRequestBudget: 10,
                perUserMonthlyRequestBudget: 3,
                profileId: parseTestProfileId(8_100_230 + index),
                requestedByUserId: parseTestUserId(member.id),
                yearMonth,
              })
            )
          ),
          { concurrency: "unbounded" }
        );

        expect(outcomes.filter(Exit.isSuccess)).toHaveLength(3);
        expect(outcomes.filter(Exit.isFailure)).toHaveLength(3);
      })
    );

    it.effect("applies only the global budget to requests without a user", () =>
      Effect.gen(function* testEffect() {
        const store = yield* FirecrawlRequestAccountingStoreService;
        const yearMonth = firecrawlYearMonthFromDate(
          new Date("2026-11-01T12:00:00.000Z")
        );
        const input = {
          monthlyRequestBudget: 2,
          perUserMonthlyRequestBudget: 1,
          yearMonth,
        } as const;

        yield* store.reserveRequest(input);
        yield* store.reserveRequest(input);
        const failure = yield* Effect.flip(store.reserveRequest(input));

        expect(failure._tag).toBe("FirecrawlMonthlyBudgetExhausted");
      })
    );

    it.effect("searches account invite targets", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-search-owner",
              name: "Effect Store Search Owner",
            })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-search-target",
              name: "Effect Store Search Target",
            })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Effect store search account",
              ownerUserId: owner.id,
              profileId: 7_299_006,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        const targets = yield* search({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          query: "Store Search",
        });
        const targetIds = targets.map((item) => item.userId);

        expect(targetIds).toContain(parseTestUserId(target.id));
        expect(targetIds).not.toContain(parseTestUserId(owner.id));
      })
    );

    it.effect("sends account access invites", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-send-owner",
              name: "Effect Store Send Owner",
            })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-send-target",
              name: "Effect Store Send Target",
            })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Effect store send account",
              ownerUserId: owner.id,
              profileId: 7_299_007,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        const invite = yield* send({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        });

        expect(invite).toMatchObject({
          accountId: parseTestAccountId(account.id),
          invitedUserId: parseTestUserId(target.id),
          ownerUserId: parseTestUserId(owner.id),
          status: "pending",
        });

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: margonemAccountAccess.status })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, invite.accessId))
            .limit(1)
        );

        expect(stored?.status).toBe("pending");

        const duplicateFailure = yield* Effect.flip(
          send({
            accountId: parseTestAccountId(account.id),
            actorUserId: parseTestUserId(owner.id),
            invitedUserId: parseTestUserId(target.id),
          })
        );

        expect(duplicateFailure).toMatchObject({
          _tag: "AccountAccessTransitionNotAllowed",
        });
      })
    );

    it.effect("responds to account access invites", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-respond-owner",
              name: "Effect Store Respond Owner",
            })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-respond-target",
              name: "Effect Store Respond Target",
            })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Effect store respond account",
              ownerUserId: owner.id,
              profileId: 7_299_009,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        const invite = yield* send({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        });
        const accepted = yield* respond({
          accessId: invite.accessId,
          actorUserId: parseTestUserId(target.id),
          response: "accept",
        });

        expect(accepted).toMatchObject({
          accessId: invite.accessId,
          invitedUserId: parseTestUserId(target.id),
          status: "accepted",
        });

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: margonemAccountAccess.status })
            .from(margonemAccountAccess)
            .where(eq(margonemAccountAccess.id, invite.accessId))
            .limit(1)
        );

        expect(stored?.status).toBe("accepted");
      })
    );

    it.effect("lists shared accounts for accepted access", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-shared-owner",
              name: "Effect Store Shared Owner",
            })
        );
        const target = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-shared-target",
              name: "Effect Store Shared Target",
            })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Effect store shared account",
              ownerUserId: owner.id,
              profileId: 7_299_012,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        yield* Effect.promise(() =>
          testDb.insert(margonemAccountAccess).values({
            accountId: account.id,
            invitedByUserId: owner.id,
            status: "accepted",
            userId: target.id,
          })
        );

        yield* Effect.promise(() =>
          testDb.insert(margonemCharacter).values({
            accountId: account.id,
            avatarUrl: null,
            characterId: 1_296_641,
            level: 300,
            name: "sharedchar",
            profession: "tracker",
            world: "jaruna",
          })
        );

        const accounts = yield* AccountSharingStoreService.use((store) =>
          store.listSharedAccounts({
            actorUserId: parseTestUserId(target.id),
          })
        );

        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toMatchObject({
          accountId: parseTestAccountId(account.id),
          characterCount: 1,
          ownerUserId: parseTestUserId(owner.id),
          ownerUserName: "Effect Store Shared Owner",
        });
      })
    );

    it.effect("lists account access grants for an owned account", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-grants-owner",
              name: "Effect Store Grants Owner",
            })
        );
        const invited = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-grants-invited",
              name: "Effect Store Grants Invited",
            })
        );
        const declined = yield* Effect.promise(
          async () =>
            await createVerifiedMember({
              id: "effect-store-grants-declined",
              name: "Effect Store Grants Declined",
            })
        );
        const [account] = yield* Effect.promise(() =>
          testDb
            .insert(margonemAccount)
            .values({
              displayName: "Effect store grants account",
              ownerUserId: owner.id,
              profileId: 7_299_013,
            })
            .returning({ id: margonemAccount.id })
        );

        if (account === undefined) {
          throw new Error("Failed to seed account");
        }

        yield* Effect.promise(() =>
          testDb.insert(margonemAccountAccess).values([
            {
              accountId: account.id,
              invitedByUserId: owner.id,
              status: "accepted",
              userId: invited.id,
            },
            {
              accountId: account.id,
              invitedByUserId: owner.id,
              status: "declined",
              userId: declined.id,
            },
          ])
        );

        const grants = yield* listAccountAccessGrants({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
        });

        expect(grants).toHaveLength(1);
        expect(grants[0]).toMatchObject({
          invitedUserId: parseTestUserId(invited.id),
          invitedUserName: "Effect Store Grants Invited",
          status: "accepted",
        });
      })
    );

    it.effect(
      "revokes accepted account access and removes recipient squad placements",
      () =>
        Effect.gen(function* testEffect() {
          const owner = yield* Effect.promise(
            async () =>
              await createVerifiedMember({
                id: "effect-store-revoke-owner",
                name: "Effect Store Revoke Owner",
              })
          );
          const target = yield* Effect.promise(
            async () =>
              await createVerifiedMember({
                id: "effect-store-revoke-target",
                name: "Effect Store Revoke Target",
              })
          );
          const [account] = yield* Effect.promise(() =>
            testDb
              .insert(margonemAccount)
              .values({
                displayName: "Effect store revoke account",
                ownerUserId: owner.id,
                profileId: 7_299_010,
              })
              .returning({ id: margonemAccount.id })
          );

          if (account === undefined) {
            throw new Error("Failed to seed account");
          }

          const [character] = yield* Effect.promise(() =>
            testDb
              .insert(margonemCharacter)
              .values({
                accountId: account.id,
                avatarUrl: null,
                characterId: 1_296_640,
                level: 300,
                name: "revokedchar",
                profession: "tracker",
                world: "jaruna",
              })
              .returning({ id: margonemCharacter.id })
          );

          if (character === undefined) {
            throw new Error("Failed to seed character");
          }

          const [group] = yield* Effect.promise(() =>
            testDb
              .insert(squadGroup)
              .values({
                name: "Recipient revoke group",
                ownerUserId: target.id,
                visibility: "private",
              })
              .returning({ id: squadGroup.id })
          );

          if (group === undefined) {
            throw new Error("Failed to seed squad group");
          }

          const [seededSquad] = yield* Effect.promise(() =>
            testDb
              .insert(squad)
              .values({
                name: "Recipient revoke squad",
                position: 0,
                squadGroupId: group.id,
              })
              .returning({ id: squad.id })
          );

          if (seededSquad === undefined) {
            throw new Error("Failed to seed squad");
          }

          const invite = yield* send({
            accountId: parseTestAccountId(account.id),
            actorUserId: parseTestUserId(owner.id),
            invitedUserId: parseTestUserId(target.id),
          });
          yield* respond({
            accessId: invite.accessId,
            actorUserId: parseTestUserId(target.id),
            response: "accept",
          });
          yield* Effect.promise(() =>
            testDb.insert(squadCharacter).values({
              accountId: account.id,
              characterId: character.id,
              position: 0,
              squadGroupId: group.id,
              squadId: seededSquad.id,
            })
          );

          const revoked = yield* revoke({
            accessId: invite.accessId,
            actorUserId: parseTestUserId(owner.id),
          });

          expect(revoked).toMatchObject({
            accessId: invite.accessId,
            accountId: parseTestAccountId(account.id),
            removedSquadCharacterCount: 1,
            revokedUserId: parseTestUserId(target.id),
          });

          const [storedAccess] = yield* Effect.promise(() =>
            testDb
              .select({ status: margonemAccountAccess.status })
              .from(margonemAccountAccess)
              .where(eq(margonemAccountAccess.id, invite.accessId))
              .limit(1)
          );
          const remainingPlacements = yield* Effect.promise(() =>
            testDb
              .select({ id: squadCharacter.id })
              .from(squadCharacter)
              .where(eq(squadCharacter.characterId, character.id))
          );

          expect(storedAccess?.status).toBe("revoked");
          expect(remainingPlacements).toEqual([]);
        })
    );
  }
);
