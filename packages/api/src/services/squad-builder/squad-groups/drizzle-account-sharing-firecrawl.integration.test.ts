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
import { describe, expect, it } from "vitest";

import { firecrawlYearMonthFromDate } from "../../../domain/squad-builder/firecrawl-year-month.ts";
import { liveEffect } from "../../../test/effect.ts";
import { createVerifiedMember } from "../../../test/integration/builders.ts";
import { testDb } from "../../../test/integration/database.ts";
import {
  parseTestAccountId,
  parseTestCredits,
  parseTestProfileId,
  parseTestUserId,
  squadBuilderIntegrationTestLayer,
} from "../../../test/squad-builder/store-integration.ts";
import { AccountImportStoreService } from "../account-import/account-import-store-service.ts";
import { AccountSharingStateService } from "../account-sharing/list-account-sharing-state-service.ts";
import { AccountAccessInviteResponsesService } from "../account-sharing/respond-to-account-access-invite-service.ts";
import { AccountAccessRevocationsService } from "../account-sharing/revoke-account-access-service.ts";
import { AccountInviteTargetsService } from "../account-sharing/search-account-invite-targets-service.ts";
import { AccountAccessInvitesService } from "../account-sharing/send-account-access-invite-service.ts";

describe("Drizzle account sharing and Firecrawl accounting integration", () => {
  it("reserves and completes Firecrawl requests through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-firecrawl-user" });
    const profileId = parseTestProfileId(8_100_201);
    const yearMonth = firecrawlYearMonthFromDate(
      new Date("2026-06-29T12:00:00.000Z")
    );

    const reserved = await liveEffect(
      squadBuilderIntegrationTestLayer,
      AccountImportStoreService.use((store) =>
        store.reserveRequest({
          monthlyRequestBudget: 10,
          profileId,
          requestedByUserId: parseTestUserId(member.id),
          yearMonth,
        })
      )
    );

    await liveEffect(
      squadBuilderIntegrationTestLayer,
      AccountImportStoreService.use((store) =>
        store.markRequestSucceeded({
          cacheState: "hit",
          completedAt: new Date("2026-06-29T12:00:00.000Z"),
          creditsUsed: parseTestCredits(1),
          firecrawlStatusCode: 200,
          requestId: reserved.requestId,
        })
      )
    );

    const [stored] = await testDb
      .select({
        cacheState: firecrawlProfileScrapeRequest.cacheState,
        creditsUsed: firecrawlProfileScrapeRequest.creditsUsed,
        firecrawlStatusCode: firecrawlProfileScrapeRequest.firecrawlStatusCode,
        status: firecrawlProfileScrapeRequest.status,
      })
      .from(firecrawlProfileScrapeRequest)
      .where(eq(firecrawlProfileScrapeRequest.id, reserved.requestId))
      .limit(1);

    expect(stored).toEqual({
      cacheState: "hit",
      creditsUsed: 1,
      firecrawlStatusCode: 200,
      status: "succeeded",
    });
  });

  it("searches account invite targets", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-search-owner",
      name: "Effect Store Search Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-search-target",
      name: "Effect Store Search Target",
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect store search account",
        ownerUserId: owner.id,
        profileId: 7_299_006,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const targets = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* targets() {
        const svc = yield* AccountInviteTargetsService;
        return yield* svc.search({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          query: "Store Search",
        });
      })
    );
    const targetIds = targets.map((item) => item.userId);

    expect(targetIds).toContain(parseTestUserId(target.id));
    expect(targetIds).not.toContain(parseTestUserId(owner.id));
  });

  it("sends account access invites", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-send-owner",
      name: "Effect Store Send Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-send-target",
      name: "Effect Store Send Target",
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect store send account",
        ownerUserId: owner.id,
        profileId: 7_299_007,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const invite = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* invite() {
        const svc = yield* AccountAccessInvitesService;
        return yield* svc.send({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        });
      })
    );

    expect(invite).toMatchObject({
      accountId: parseTestAccountId(account.id),
      invitedUserId: parseTestUserId(target.id),
      ownerUserId: parseTestUserId(owner.id),
      status: "pending",
    });

    const [stored] = await testDb
      .select({ status: margonemAccountAccess.status })
      .from(margonemAccountAccess)
      .where(eq(margonemAccountAccess.id, invite.accessId))
      .limit(1);

    expect(stored?.status).toBe("pending");

    await expect(
      liveEffect(
        squadBuilderIntegrationTestLayer,
        Effect.gen(function* sendDuplicateAccessInviteEffect() {
          const svc = yield* AccountAccessInvitesService;
          return yield* svc.send({
            accountId: parseTestAccountId(account.id),
            actorUserId: parseTestUserId(owner.id),
            invitedUserId: parseTestUserId(target.id),
          });
        })
      )
    ).rejects.toMatchObject({ _tag: "AccountAccessTransitionNotAllowed" });
  });

  it("responds to account access invites", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-respond-owner",
      name: "Effect Store Respond Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-respond-target",
      name: "Effect Store Respond Target",
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect store respond account",
        ownerUserId: owner.id,
        profileId: 7_299_009,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const invite = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* invite() {
        const svc = yield* AccountAccessInvitesService;
        return yield* svc.send({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        });
      })
    );
    const accepted = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* accepted() {
        const svc = yield* AccountAccessInviteResponsesService;
        return yield* svc.respond({
          accessId: invite.accessId,
          actorUserId: parseTestUserId(target.id),
          response: "accept",
        });
      })
    );

    expect(accepted).toMatchObject({
      accessId: invite.accessId,
      invitedUserId: parseTestUserId(target.id),
      status: "accepted",
    });

    const [stored] = await testDb
      .select({ status: margonemAccountAccess.status })
      .from(margonemAccountAccess)
      .where(eq(margonemAccountAccess.id, invite.accessId))
      .limit(1);

    expect(stored?.status).toBe("accepted");
  });

  it("lists shared accounts for accepted access", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-shared-owner",
      name: "Effect Store Shared Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-shared-target",
      name: "Effect Store Shared Target",
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect store shared account",
        ownerUserId: owner.id,
        profileId: 7_299_012,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    await testDb.insert(margonemAccountAccess).values({
      accountId: account.id,
      invitedByUserId: owner.id,
      status: "accepted",
      userId: target.id,
    });

    await testDb.insert(margonemCharacter).values({
      accountId: account.id,
      avatarUrl: null,
      characterId: 1_296_641,
      level: 300,
      name: "sharedchar",
      profession: "tracker",
      world: "jaruna",
    });

    const accounts = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* accounts() {
        const svc = yield* AccountSharingStateService;
        return yield* svc.listSharedAccounts({
          actorUserId: parseTestUserId(target.id),
        });
      })
    );

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      accountId: parseTestAccountId(account.id),
      characterCount: 1,
      ownerUserId: parseTestUserId(owner.id),
      ownerUserName: "Effect Store Shared Owner",
    });
  });

  it("lists account access grants for an owned account", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-grants-owner",
      name: "Effect Store Grants Owner",
    });
    const invited = await createVerifiedMember({
      id: "effect-store-grants-invited",
      name: "Effect Store Grants Invited",
    });
    const declined = await createVerifiedMember({
      id: "effect-store-grants-declined",
      name: "Effect Store Grants Declined",
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect store grants account",
        ownerUserId: owner.id,
        profileId: 7_299_013,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    await testDb.insert(margonemAccountAccess).values([
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
    ]);

    const grants = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* grants() {
        const svc = yield* AccountSharingStateService;
        return yield* svc.listAccountAccessGrants({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
        });
      })
    );

    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      invitedUserId: parseTestUserId(invited.id),
      invitedUserName: "Effect Store Grants Invited",
      status: "accepted",
    });
  });

  it("revokes accepted account access and removes recipient squad placements", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-revoke-owner",
      name: "Effect Store Revoke Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-revoke-target",
      name: "Effect Store Revoke Target",
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect store revoke account",
        ownerUserId: owner.id,
        profileId: 7_299_010,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const [character] = await testDb
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
      .returning({ id: margonemCharacter.id });

    if (character === undefined) {
      throw new Error("Failed to seed character");
    }

    const [group] = await testDb
      .insert(squadGroup)
      .values({
        name: "Recipient revoke group",
        ownerUserId: target.id,
        visibility: "private",
      })
      .returning({ id: squadGroup.id });

    if (group === undefined) {
      throw new Error("Failed to seed squad group");
    }

    const [seededSquad] = await testDb
      .insert(squad)
      .values({
        name: "Recipient revoke squad",
        position: 0,
        squadGroupId: group.id,
      })
      .returning({ id: squad.id });

    if (seededSquad === undefined) {
      throw new Error("Failed to seed squad");
    }

    const invite = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* invite() {
        const svc = yield* AccountAccessInvitesService;
        return yield* svc.send({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        });
      })
    );
    await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* acceptAccountAccessInviteEffect() {
        const svc = yield* AccountAccessInviteResponsesService;
        return yield* svc.respond({
          accessId: invite.accessId,
          actorUserId: parseTestUserId(target.id),
          response: "accept",
        });
      })
    );
    await testDb.insert(squadCharacter).values({
      accountId: account.id,
      characterId: character.id,
      position: 0,
      squadGroupId: group.id,
      squadId: seededSquad.id,
    });

    const revoked = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* revoked() {
        const svc = yield* AccountAccessRevocationsService;
        return yield* svc.revoke({
          accessId: invite.accessId,
          actorUserId: parseTestUserId(owner.id),
        });
      })
    );

    expect(revoked).toMatchObject({
      accessId: invite.accessId,
      accountId: parseTestAccountId(account.id),
      removedSquadCharacterCount: 1,
      revokedUserId: parseTestUserId(target.id),
    });

    const [storedAccess] = await testDb
      .select({ status: margonemAccountAccess.status })
      .from(margonemAccountAccess)
      .where(eq(margonemAccountAccess.id, invite.accessId))
      .limit(1);
    const remainingPlacements = await testDb
      .select({ id: squadCharacter.id })
      .from(squadCharacter)
      .where(eq(squadCharacter.characterId, character.id));

    expect(storedAccess?.status).toBe("revoked");
    expect(remainingPlacements).toEqual([]);
  });
});
