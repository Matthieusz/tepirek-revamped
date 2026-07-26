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
import { AccountSharingStateService } from "../account-sharing/list-account-sharing-state-service.ts";
import { respond } from "../account-sharing/respond-to-account-access-invite-service.ts";
import { revoke } from "../account-sharing/revoke-account-access-service.ts";
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
          const member = yield* Effect.promise(() =>
            createVerifiedMember({ id: "effect-firecrawl-user" })
          );
          const profileId = parseTestProfileId(8_100_201);
          const yearMonth = firecrawlYearMonthFromDate(
            new Date("2026-06-29T12:00:00.000Z")
          );

          const reserved = yield* FirecrawlRequestAccountingStoreService.use(
            (store) =>
              store.reserveRequest({
                monthlyRequestBudget: 10,
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

    it.effect("searches account invite targets", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-search-owner",
            name: "Effect Store Search Owner",
          })
        );
        const target = yield* Effect.promise(() =>
          createVerifiedMember({
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
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-send-owner",
            name: "Effect Store Send Owner",
          })
        );
        const target = yield* Effect.promise(() =>
          createVerifiedMember({
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
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-respond-owner",
            name: "Effect Store Respond Owner",
          })
        );
        const target = yield* Effect.promise(() =>
          createVerifiedMember({
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
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-shared-owner",
            name: "Effect Store Shared Owner",
          })
        );
        const target = yield* Effect.promise(() =>
          createVerifiedMember({
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

        const accounts = yield* Effect.gen(function* accounts() {
          const svc = yield* AccountSharingStateService;
          return yield* svc.listSharedAccounts({
            actorUserId: parseTestUserId(target.id),
          });
        });

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
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-grants-owner",
            name: "Effect Store Grants Owner",
          })
        );
        const invited = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-grants-invited",
            name: "Effect Store Grants Invited",
          })
        );
        const declined = yield* Effect.promise(() =>
          createVerifiedMember({
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

        const grants = yield* Effect.gen(function* grants() {
          const svc = yield* AccountSharingStateService;
          return yield* svc.listAccountAccessGrants({
            accountId: parseTestAccountId(account.id),
            actorUserId: parseTestUserId(owner.id),
          });
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
          const owner = yield* Effect.promise(() =>
            createVerifiedMember({
              id: "effect-store-revoke-owner",
              name: "Effect Store Revoke Owner",
            })
          );
          const target = yield* Effect.promise(() =>
            createVerifiedMember({
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
