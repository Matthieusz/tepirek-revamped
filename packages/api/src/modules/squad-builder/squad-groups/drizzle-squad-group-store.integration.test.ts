import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountAccess,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { makeApiSquadBuilderLayer } from "../../../effect-app.js";
import { liveEffect } from "../../../test/effect.js";
import { createVerifiedMember } from "../../../test/integration/builders.js";
import {
  defaultTestDatabaseUrl,
  testDb,
} from "../../../test/integration/database.js";
import { parseAccountDisplayName } from "../account-display-name.js";
import { AccountImportStoreService } from "../account-import/account-import-store-service.js";
import { confirm as confirmOwnedAccountImport } from "../account-import/confirm-owned-account-import-service.js";
import { list as listOwnedMargonemAccounts } from "../account-import/list-owned-margonem-accounts.js";
import { AccountRefetchStoreService } from "../account-refetch/account-refetch-store-service.js";
import { apply as applyAccountRefetch } from "../account-refetch/apply-account-refetch-service.js";
import { use as accountSharingState } from "../account-sharing/list-account-sharing-state-service.js";
import { use as accountAccessInviteResponses } from "../account-sharing/respond-to-account-access-invite-service.js";
import { use as accountAccessRevocations } from "../account-sharing/revoke-account-access-service.js";
import { use as accountInviteTargets } from "../account-sharing/search-account-invite-targets-service.js";
import { use as accountAccessInvites } from "../account-sharing/send-account-access-invite-service.js";
import { parseAppUserId } from "../app-user-id.js";
import { parseFirecrawlCreditCount } from "../firecrawl-config.js";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import { computeMargonemAccountRefetchDiff } from "../margonem-account-refetch-diff.js";
import { parseMargonemProfileId } from "../margonem-profile-id.js";
import { isOk } from "../result.js";
import { create as createSquadGroup } from "./create-squad-group.js";
import { list as listAvailableSquadCharacters } from "./list-available-squad-characters.js";
import { list as listGlobalSquadGroups } from "./list-global-squad-groups.js";
import { getMine, listMine } from "./list-squad-groups.js";
import { use as squadGroupEditorInviteResponses } from "./respond-to-squad-group-invite-service.js";
import { use as squadGroupEditorRevocations } from "./revoke-squad-group-editor-service.js";
import { save as saveSquadGroup } from "./save-squad-group.js";
import { use as squadGroupEditorInvites } from "./send-squad-group-editor-invite-service.js";
import { set as setSquadGroupVisibility } from "./set-squad-group-visibility.js";

const apiTestLayer = makeApiSquadBuilderLayer(defaultTestDatabaseUrl);

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestAccountId = (value: number) => {
  const accountId = parseMargonemAccountId(value);

  if (!isOk(accountId)) {
    throw new Error("Expected test account id to be valid");
  }

  return accountId.value;
};

const parseTestProfileId = (value: number) => {
  const profileId = parseMargonemProfileId(value);

  if (!isOk(profileId)) {
    throw new Error("Expected test profile id to be valid");
  }

  return profileId.value;
};

const parseTestCredits = (value: number) => {
  const credits = parseFirecrawlCreditCount(value);

  if (!isOk(credits)) {
    throw new Error("Expected test Firecrawl credits to be valid");
  }

  return credits.value;
};

describe("DrizzleSquadGroupStoreService integration", () => {
  it("creates a private squad group for the actor", async () => {
    const member = await createVerifiedMember({ id: "effect-create-owner" });
    const service = { create: createSquadGroup };

    const created = await liveEffect(
      apiTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "  Effect group  ",
      })
    );

    expect(created).toMatchObject({
      characterCount: 0,
      name: "Effect group",
      squadCount: 0,
    });

    const [stored] = await testDb
      .select({
        name: squadGroup.name,
        ownerUserId: squadGroup.ownerUserId,
        visibility: squadGroup.visibility,
      })
      .from(squadGroup)
      .where(eq(squadGroup.id, created.groupId))
      .limit(1);

    expect(stored).toEqual({
      name: "Effect group",
      ownerUserId: member.id,
      visibility: "private",
    });
  });

  it("lists only squad groups owned by the actor", async () => {
    const member = await createVerifiedMember({ id: "effect-list-owner" });
    const other = await createVerifiedMember({ id: "effect-list-other" });
    const service = { create: createSquadGroup };
    const listService = { getMine, listMine };

    await liveEffect(
      apiTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "First listed group",
      })
    );
    await liveEffect(
      apiTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "Second listed group",
      })
    );
    await liveEffect(
      apiTestLayer,
      service.create({
        actorUserId: parseTestUserId(other.id),
        name: "Other listed group",
      })
    );

    const groups = await liveEffect(
      apiTestLayer,
      listService.listMine({ actorUserId: parseTestUserId(member.id) })
    );

    const groupNames = groups.map((group) => group.name);

    expect(groupNames).toContain("First listed group");
    expect(groupNames).toContain("Second listed group");
    expect(groupNames).not.toContain("Other listed group");
  });

  it("loads a squad group detail for the owner", async () => {
    const member = await createVerifiedMember({ id: "effect-detail-owner" });
    const service = { create: createSquadGroup };
    const listService = { getMine, listMine };

    const created = await liveEffect(
      apiTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect detail group",
      })
    );

    const detail = await liveEffect(
      apiTestLayer,
      listService.getMine({
        actorUserId: parseTestUserId(member.id),
        groupId: created.groupId,
      })
    );

    expect(detail).toMatchObject({
      accessRole: "owner",
      groupId: created.groupId,
      name: "Effect detail group",
      ownerUserId: parseTestUserId(member.id),
      squads: [],
      visibility: "private",
    });
  });

  it("saves a squad group snapshot through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-save-owner" });
    const createService = { create: createSquadGroup };
    const saveService = { save: saveSquadGroup };

    const created = await liveEffect(
      apiTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect save original",
      })
    );

    const saved = await liveEffect(
      apiTestLayer,
      saveService.save({
        actorUserId: parseTestUserId(member.id),
        groupId: created.groupId,
        name: "Effect save updated",
        squads: [
          {
            characters: [],
            clientKey: "first-squad",
            name: "First squad",
            position: 0,
          },
        ],
      })
    );

    expect(saved).toMatchObject({
      accessRole: "owner",
      groupId: created.groupId,
      name: "Effect save updated",
      squads: [{ characters: [], name: "First squad", position: 0 }],
    });
  });

  it("lists available Jaruna characters for the squad group owner", async () => {
    const member = await createVerifiedMember({ id: "effect-available-owner" });
    const service = { create: createSquadGroup };
    const listService = { list: listAvailableSquadCharacters };

    const created = await liveEffect(
      apiTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect available group",
      })
    );
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Available account",
        ownerUserId: member.id,
        profileId: 8_100_001,
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
        characterId: 1_296_625,
        level: 315,
        name: "informati",
        profession: "tracker",
        world: "jaruna",
      })
      .returning({ id: margonemCharacter.id });

    if (character === undefined) {
      throw new Error("Failed to seed character");
    }

    const characters = await liveEffect(
      apiTestLayer,
      listService.list({
        actorUserId: parseTestUserId(member.id),
        groupId: created.groupId,
      })
    );

    expect(characters).toHaveLength(1);
    expect(characters[0]).toMatchObject({
      accountId: account.id,
      accountOwnerUserId: parseTestUserId(member.id),
      characterId: character.id,
      name: "informati",
      profession: "tracker",
      world: "jaruna",
    });
  });

  it("lists only Margonem accounts owned by the actor", async () => {
    const member = await createVerifiedMember({ id: "effect-owned-owner" });
    const other = await createVerifiedMember({ id: "effect-owned-other" });
    const service = { list: listOwnedMargonemAccounts };

    const [ownedAccount] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Owned Effect account",
        lastFetchedAt: new Date("2026-06-30T12:00:00.000Z"),
        ownerUserId: member.id,
        profileId: 8_100_101,
      })
      .returning({ id: margonemAccount.id });

    if (ownedAccount === undefined) {
      throw new Error("Failed to seed owned account");
    }

    await testDb.insert(margonemAccount).values({
      displayName: "Other Effect account",
      ownerUserId: other.id,
      profileId: 8_100_102,
    });

    await testDb.insert(margonemCharacter).values({
      accountId: ownedAccount.id,
      avatarUrl: null,
      characterId: 1_296_627,
      level: 300,
      name: "ownedchar",
      profession: "tracker",
      world: "jaruna",
    });

    const accounts = await liveEffect(
      apiTestLayer,
      service.list({ actorUserId: parseTestUserId(member.id) })
    );

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      accountId: ownedAccount.id,
      characterCount: 1,
      displayName: "Owned Effect account",
      generatedProfileUrl: "https://www.margonem.pl/profile/view,8100101",
      profileId: 8_100_101,
    });
  });

  it("creates pending account imports through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-pending-user" });
    const displayName = parseAccountDisplayName("Effect pending");

    if (!isOk(displayName)) {
      throw new Error("Expected display name to be valid");
    }

    const pending = await liveEffect(
      apiTestLayer,
      AccountImportStoreService.use((store) =>
        store.createPendingImport({
          actorUserId: parseTestUserId(member.id),
          defaultDisplayName: displayName.value,
          expiresAt: new Date("2026-06-29T12:30:00.000Z"),
          fetchedAt: new Date("2026-06-29T12:00:00.000Z"),
          firecrawlCreditsUsed: parseTestCredits(1),
          generatedProfileUrl: "https://www.margonem.pl/profile/view,8100150",
          jarunaCharacters: [
            {
              avatarUrl: null,
              characterId: 1_296_628 as never,
              level: 301 as never,
              name: "pendingchar",
              profession: "tracker",
              world: "jaruna",
            },
          ],
          profileId: parseTestProfileId(8_100_150),
          suggestedAccountName: "Effect pending",
        })
      )
    );

    const [stored] = await testDb
      .select({
        actorUserId: margonemAccountImportPreview.actorUserId,
        defaultDisplayName: margonemAccountImportPreview.defaultDisplayName,
        profileId: margonemAccountImportPreview.profileId,
      })
      .from(margonemAccountImportPreview)
      .where(eq(margonemAccountImportPreview.id, pending.id))
      .limit(1);

    const characters = await testDb
      .select({ name: margonemAccountImportPreviewCharacter.name })
      .from(margonemAccountImportPreviewCharacter)
      .where(
        eq(margonemAccountImportPreviewCharacter.importPreviewId, pending.id)
      );

    expect(stored).toEqual({
      actorUserId: member.id,
      defaultDisplayName: "Effect pending",
      profileId: 8_100_150,
    });
    expect(characters).toEqual([{ name: "pendingchar" }]);
  });

  it("loads accounts and creates pending refetch previews through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-refetch-owner" });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Refetch account",
        ownerUserId: member.id,
        profileId: 8_100_160,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    await testDb.insert(margonemCharacter).values({
      accountId: account.id,
      avatarUrl: null,
      characterId: 1_296_630,
      level: 300,
      name: "oldrefetch",
      profession: "tracker",
      world: "jaruna",
    });

    const loaded = await liveEffect(
      apiTestLayer,
      AccountRefetchStoreService.use((store) =>
        store.getAccountForRefetch({
          accountId: account.id as never,
          actorUserId: parseTestUserId(member.id),
        })
      )
    );

    const fetchedAt = new Date("2026-06-29T12:00:00.000Z");
    const latestCharacters = [
      {
        avatarUrl: null,
        characterId: 1_296_630 as never,
        level: 301 as never,
        name: "newrefetch",
        profession: "tracker" as const,
        world: "jaruna" as const,
      },
    ];
    const pending = await liveEffect(
      apiTestLayer,
      AccountRefetchStoreService.use((store) =>
        store.createPendingRefetch({
          accountId: loaded.accountId,
          actorUserId: parseTestUserId(member.id),
          diff: computeMargonemAccountRefetchDiff({
            accountId: loaded.accountId,
            currentCharacters: loaded.currentCharacters,
            fetchedAt,
            latestCharacters,
            profileId: loaded.profileId,
          }),
          expiresAt: new Date("2026-06-29T12:30:00.000Z"),
          fetchedAt,
          firecrawlCreditsUsed: parseTestCredits(1),
          latestCharacters,
          profileId: loaded.profileId,
        })
      )
    );

    const [stored] = await testDb
      .select({
        accountId: margonemAccountRefetchPreview.accountId,
        actorUserId: margonemAccountRefetchPreview.actorUserId,
        profileId: margonemAccountRefetchPreview.profileId,
      })
      .from(margonemAccountRefetchPreview)
      .where(eq(margonemAccountRefetchPreview.id, pending.id))
      .limit(1);
    const characters = await testDb
      .select({ name: margonemAccountRefetchPreviewCharacter.name })
      .from(margonemAccountRefetchPreviewCharacter)
      .where(
        eq(margonemAccountRefetchPreviewCharacter.refetchPreviewId, pending.id)
      );

    expect(loaded).toMatchObject({
      accountId: account.id,
      currentCharacters: [{ name: "oldrefetch" }],
      displayName: "Refetch account",
      profileId: 8_100_160,
    });
    expect(stored).toEqual({
      accountId: account.id,
      actorUserId: member.id,
      profileId: 8_100_160,
    });
    expect(characters).toEqual([{ name: "newrefetch" }]);
  });

  it("applies pending account refetches through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-apply-owner" });
    const service = { apply: applyAccountRefetch };
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Apply refetch account",
        ownerUserId: member.id,
        profileId: 8_100_170,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const [removedCharacter] = await testDb
      .insert(margonemCharacter)
      .values({
        accountId: account.id,
        avatarUrl: null,
        characterId: 1_296_631,
        level: 300,
        name: "removedrefetch",
        profession: "tracker",
        world: "jaruna",
      })
      .returning({ id: margonemCharacter.id });

    if (removedCharacter === undefined) {
      throw new Error("Failed to seed removed character");
    }

    await testDb.insert(margonemCharacter).values({
      accountId: account.id,
      avatarUrl: null,
      characterId: 1_296_632,
      level: 300,
      name: "updatedrefetch",
      profession: "tracker",
      world: "jaruna",
    });

    const [group] = await testDb
      .insert(squadGroup)
      .values({
        name: "Apply refetch group",
        ownerUserId: member.id,
        visibility: "private",
      })
      .returning({ id: squadGroup.id });

    if (group === undefined) {
      throw new Error("Failed to seed squad group");
    }

    const [seededSquad] = await testDb
      .insert(squad)
      .values({
        name: "Apply squad",
        position: 0,
        squadGroupId: group.id,
      })
      .returning({ id: squad.id });

    if (seededSquad === undefined) {
      throw new Error("Failed to seed squad");
    }

    await testDb.insert(squadCharacter).values({
      accountId: account.id,
      characterId: removedCharacter.id,
      position: 0,
      squadGroupId: group.id,
      squadId: seededSquad.id,
    });

    const [pending] = await testDb
      .insert(margonemAccountRefetchPreview)
      .values({
        accountId: account.id,
        actorUserId: member.id,
        diffJson: "{}",
        expiresAt: new Date("2099-06-29T12:30:00.000Z"),
        fetchedAt: new Date("2026-06-29T12:00:00.000Z"),
        firecrawlCreditsUsed: 1,
        profileId: 8_100_170,
      })
      .returning({ id: margonemAccountRefetchPreview.id });

    if (pending === undefined) {
      throw new Error("Failed to seed pending refetch");
    }

    await testDb.insert(margonemAccountRefetchPreviewCharacter).values([
      {
        avatarUrl: null,
        characterId: 1_296_632,
        level: 301,
        name: "updatedrefetch",
        profession: "tracker",
        refetchPreviewId: pending.id,
        world: "jaruna",
      },
      {
        avatarUrl: null,
        characterId: 1_296_633,
        level: 302,
        name: "addedrefetch",
        profession: "mage",
        refetchPreviewId: pending.id,
        world: "jaruna",
      },
    ]);

    const applied = await liveEffect(
      apiTestLayer,
      service.apply({
        actorUserId: parseTestUserId(member.id),
        refetchPreviewId: pending.id as never,
      })
    );

    expect(applied).toMatchObject({
      accountId: account.id,
      addedCharacterCount: 1,
      profileId: 8_100_170,
      removedCharacterCount: 1,
      removedSquadCharacterCount: 1,
      updatedCharacterCount: 1,
    });

    const storedCharacters = await testDb
      .select({
        characterId: margonemCharacter.characterId,
        level: margonemCharacter.level,
      })
      .from(margonemCharacter)
      .where(eq(margonemCharacter.accountId, account.id));
    const [storedPreview] = await testDb
      .select({ appliedAt: margonemAccountRefetchPreview.appliedAt })
      .from(margonemAccountRefetchPreview)
      .where(eq(margonemAccountRefetchPreview.id, pending.id))
      .limit(1);
    const remainingPlacements = await testDb
      .select({ id: squadCharacter.id })
      .from(squadCharacter)
      .where(eq(squadCharacter.characterId, removedCharacter.id));

    expect(storedCharacters).toEqual(
      expect.arrayContaining([
        { characterId: 1_296_632, level: 301 },
        { characterId: 1_296_633, level: 302 },
      ])
    );
    expect(
      storedCharacters.map((character) => character.characterId)
    ).not.toContain(1_296_631);
    expect(storedPreview?.appliedAt).toBeInstanceOf(Date);
    expect(remainingPlacements).toEqual([]);
  });

  it("confirms pending account imports through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-confirm-user" });
    const service = { confirm: confirmOwnedAccountImport };
    const [pending] = await testDb
      .insert(margonemAccountImportPreview)
      .values({
        actorUserId: member.id,
        defaultDisplayName: "Effect confirm",
        expiresAt: new Date("2099-06-29T12:30:00.000Z"),
        fetchedAt: new Date("2026-06-29T12:00:00.000Z"),
        firecrawlCreditsUsed: 1,
        profileId: 8_100_175,
        suggestedAccountName: "Effect confirm",
      })
      .returning({ id: margonemAccountImportPreview.id });

    if (pending === undefined) {
      throw new Error("Failed to seed pending import");
    }

    await testDb.insert(margonemAccountImportPreviewCharacter).values({
      avatarUrl: null,
      characterId: 1_296_629,
      importPreviewId: pending.id,
      level: 302,
      name: "confirmedchar",
      profession: "tracker",
      world: "jaruna",
    });

    const confirmed = await liveEffect(
      apiTestLayer,
      service.confirm({
        actorUserId: parseTestUserId(member.id),
        displayName: "  Confirmed Effect  ",
        pendingImportId: pending.id as never,
      })
    );

    expect(confirmed).toMatchObject({
      characterCount: 1,
      displayName: "Confirmed Effect",
      generatedProfileUrl: "https://www.margonem.pl/profile/view,8100175",
      profileId: 8_100_175,
    });

    const [storedAccount] = await testDb
      .select({ displayName: margonemAccount.displayName })
      .from(margonemAccount)
      .where(eq(margonemAccount.id, confirmed.accountId))
      .limit(1);
    const [storedCharacter] = await testDb
      .select({ name: margonemCharacter.name })
      .from(margonemCharacter)
      .where(eq(margonemCharacter.accountId, confirmed.accountId))
      .limit(1);
    const [storedPreview] = await testDb
      .select({ confirmedAt: margonemAccountImportPreview.confirmedAt })
      .from(margonemAccountImportPreview)
      .where(eq(margonemAccountImportPreview.id, pending.id))
      .limit(1);

    expect(storedAccount).toEqual({ displayName: "Confirmed Effect" });
    expect(storedCharacter).toEqual({ name: "confirmedchar" });
    expect(storedPreview?.confirmedAt).toBeInstanceOf(Date);
  });

  it("reserves and completes Firecrawl requests through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-firecrawl-user" });
    const profileId = parseTestProfileId(8_100_201);
    const yearMonth = firecrawlYearMonthFromDate(
      new Date("2026-06-29T12:00:00.000Z")
    );

    const reserved = await liveEffect(
      apiTestLayer,
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
      apiTestLayer,
      AccountImportStoreService.use((store) =>
        store.markRequestSucceeded({
          cacheState: "hit",
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

  it("changes squad group visibility for the owner", async () => {
    const member = await createVerifiedMember({
      id: "effect-visibility-owner",
    });
    const createService = { create: createSquadGroup };
    const visibilityService = { set: setSquadGroupVisibility };

    const created = await liveEffect(
      apiTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect visibility group",
      })
    );

    const changed = await liveEffect(
      apiTestLayer,
      visibilityService.set({
        actorUserId: parseTestUserId(member.id),
        groupId: created.groupId,
        visibility: "global",
      })
    );

    expect(changed).toMatchObject({
      groupId: created.groupId,
      visibility: "global",
    });

    const [stored] = await testDb
      .select({ visibility: squadGroup.visibility })
      .from(squadGroup)
      .where(eq(squadGroup.id, created.groupId))
      .limit(1);

    expect(stored?.visibility).toBe("global");
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
      apiTestLayer,
      accountInviteTargets.search({
        accountId: parseTestAccountId(account.id),
        actorUserId: parseTestUserId(owner.id),
        query: "Store Search",
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
      apiTestLayer,
      accountAccessInvites.send({
        accountId: parseTestAccountId(account.id),
        actorUserId: parseTestUserId(owner.id),
        invitedUserId: parseTestUserId(target.id),
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
        apiTestLayer,
        accountAccessInvites.send({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(owner.id),
          invitedUserId: parseTestUserId(target.id),
        })
      )
    ).rejects.toMatchObject({ _tag: "AccountAccessTransitionNotAllowed" });
  });

  it("sends squad group editor invites", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-squad-send-owner",
      name: "Effect Store Squad Send Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-squad-send-target",
      name: "Effect Store Squad Send Target",
    });
    const createService = { create: createSquadGroup };
    const group = await liveEffect(
      apiTestLayer,
      createService.create({
        actorUserId: parseTestUserId(owner.id),
        name: "Effect store squad send group",
      })
    );

    const invite = await liveEffect(
      apiTestLayer,
      squadGroupEditorInvites.send({
        actorUserId: parseTestUserId(owner.id),
        groupId: group.groupId,
        invitedUserId: parseTestUserId(target.id),
      })
    );

    expect(invite).toMatchObject({
      ownerUserId: parseTestUserId(owner.id),
      ownerUserName: "Effect Store Squad Send Owner",
      squadGroupId: group.groupId,
      status: "pending",
    });

    const [stored] = await testDb
      .select({
        invitedUserId: squadGroupInvitation.invitedUserId,
        status: squadGroupInvitation.status,
      })
      .from(squadGroupInvitation)
      .where(eq(squadGroupInvitation.id, invite.invitationId))
      .limit(1);

    expect(stored).toEqual({
      invitedUserId: target.id,
      status: "pending",
    });

    await expect(
      liveEffect(
        apiTestLayer,
        squadGroupEditorInvites.send({
          actorUserId: parseTestUserId(owner.id),
          groupId: group.groupId,
          invitedUserId: parseTestUserId(target.id),
        })
      )
    ).rejects.toMatchObject({
      _tag: "SquadGroupInvitationTransitionNotAllowed",
    });
  });

  it("responds to squad group editor invites", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-squad-respond-owner",
      name: "Effect Store Squad Respond Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-squad-respond-target",
      name: "Effect Store Squad Respond Target",
    });
    const createService = { create: createSquadGroup };
    const group = await liveEffect(
      apiTestLayer,
      createService.create({
        actorUserId: parseTestUserId(owner.id),
        name: "Effect store squad respond group",
      })
    );
    const invite = await liveEffect(
      apiTestLayer,
      squadGroupEditorInvites.send({
        actorUserId: parseTestUserId(owner.id),
        groupId: group.groupId,
        invitedUserId: parseTestUserId(target.id),
      })
    );
    const accepted = await liveEffect(
      apiTestLayer,
      squadGroupEditorInviteResponses.respond({
        actorUserId: parseTestUserId(target.id),
        invitationId: invite.invitationId,
        response: "accept",
      })
    );

    expect(accepted).toMatchObject({
      invitationId: invite.invitationId,
      squadGroupId: group.groupId,
      status: "accepted",
    });

    const [stored] = await testDb
      .select({ status: squadGroupInvitation.status })
      .from(squadGroupInvitation)
      .where(eq(squadGroupInvitation.id, invite.invitationId))
      .limit(1);

    expect(stored?.status).toBe("accepted");
  });

  it("revokes squad group editor invites", async () => {
    const owner = await createVerifiedMember({
      id: "effect-store-squad-revoke-owner",
      name: "Effect Store Squad Revoke Owner",
    });
    const target = await createVerifiedMember({
      id: "effect-store-squad-revoke-target",
      name: "Effect Store Squad Revoke Target",
    });
    const createService = { create: createSquadGroup };
    const group = await liveEffect(
      apiTestLayer,
      createService.create({
        actorUserId: parseTestUserId(owner.id),
        name: "Effect store squad revoke group",
      })
    );
    const invite = await liveEffect(
      apiTestLayer,
      squadGroupEditorInvites.send({
        actorUserId: parseTestUserId(owner.id),
        groupId: group.groupId,
        invitedUserId: parseTestUserId(target.id),
      })
    );
    const revoked = await liveEffect(
      apiTestLayer,
      squadGroupEditorRevocations.revoke({
        actorUserId: parseTestUserId(owner.id),
        invitationId: invite.invitationId,
      })
    );

    expect(revoked).toMatchObject({
      invitationId: invite.invitationId,
      squadGroupId: group.groupId,
      status: "revoked",
    });

    const [stored] = await testDb
      .select({ status: squadGroupInvitation.status })
      .from(squadGroupInvitation)
      .where(eq(squadGroupInvitation.id, invite.invitationId))
      .limit(1);

    expect(stored?.status).toBe("revoked");
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
      apiTestLayer,
      accountAccessInvites.send({
        accountId: parseTestAccountId(account.id),
        actorUserId: parseTestUserId(owner.id),
        invitedUserId: parseTestUserId(target.id),
      })
    );
    const accepted = await liveEffect(
      apiTestLayer,
      accountAccessInviteResponses.respond({
        accessId: invite.accessId,
        actorUserId: parseTestUserId(target.id),
        response: "accept",
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
      apiTestLayer,
      accountSharingState.listSharedAccounts({
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
      apiTestLayer,
      accountSharingState.listAccountAccessGrants({
        accountId: parseTestAccountId(account.id),
        actorUserId: parseTestUserId(owner.id),
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
      apiTestLayer,
      accountAccessInvites.send({
        accountId: parseTestAccountId(account.id),
        actorUserId: parseTestUserId(owner.id),
        invitedUserId: parseTestUserId(target.id),
      })
    );
    await liveEffect(
      apiTestLayer,
      accountAccessInviteResponses.respond({
        accessId: invite.accessId,
        actorUserId: parseTestUserId(target.id),
        response: "accept",
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
      apiTestLayer,
      accountAccessRevocations.revoke({
        accessId: invite.accessId,
        actorUserId: parseTestUserId(owner.id),
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

  it("lists globally visible squad groups", async () => {
    const member = await createVerifiedMember({ id: "effect-global-owner" });
    const other = await createVerifiedMember({ id: "effect-global-other" });
    const createService = { create: createSquadGroup };
    const visibilityService = { set: setSquadGroupVisibility };
    const listGlobalService = { list: listGlobalSquadGroups };

    const globalGroup = await liveEffect(
      apiTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect global group",
      })
    );
    await liveEffect(
      apiTestLayer,
      visibilityService.set({
        actorUserId: parseTestUserId(member.id),
        groupId: globalGroup.groupId,
        visibility: "global",
      })
    );
    await liveEffect(
      apiTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect private group",
      })
    );

    const groups = await liveEffect(
      apiTestLayer,
      listGlobalService.list({ actorUserId: parseTestUserId(other.id) })
    );
    const groupNames = groups.map((group) => group.name);

    expect(groupNames).toContain("Effect global group");
    expect(groupNames).not.toContain("Effect private group");
    expect(
      groups.find((group) => group.groupId === globalGroup.groupId)
    ).toMatchObject({
      ownerUserId: parseTestUserId(member.id),
      ownerUserName: member.name,
    });
  });
});
