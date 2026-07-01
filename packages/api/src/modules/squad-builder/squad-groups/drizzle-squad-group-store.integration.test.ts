import {
  firecrawlProfileScrapeRequest,
  margonemAccount,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { makeApiManagedRuntime } from "../../../effect-app";
import { createVerifiedMember } from "../../../test/integration/builders";
import {
  defaultTestDatabaseUrl,
  testDb,
} from "../../../test/integration/database";
import { parseAccountDisplayName } from "../account-display-name";
import { EffectConfirmOwnedAccountImport } from "../account-import/effect-confirm-owned-account-import";
import { ListOwnedMargonemAccounts } from "../account-import/list-owned-margonem-accounts";
import { systemClock } from "../account-import/preview-margonem-profile-import";
import { parseAppUserId } from "../app-user-id";
import { parseFirecrawlCreditCount } from "../firecrawl-config";
import { firecrawlYearMonthFromDate } from "../firecrawl-year-month";
import { computeMargonemAccountRefetchDiff } from "../margonem-account-refetch-diff";
import { parseMargonemProfileId } from "../margonem-profile-id";
import { isOk } from "../result";
import { CreateSquadGroup } from "./create-squad-group";
import { ListAvailableSquadCharacters } from "./list-available-squad-characters";
import { ListGlobalSquadGroups } from "./list-global-squad-groups";
import { ListSquadGroups } from "./list-squad-groups";
import { SetSquadGroupVisibility } from "./set-squad-group-visibility";
import { EffectSquadGroupStore } from "./squad-group-store";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
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

describe("DrizzleEffectSquadGroupStore integration", () => {
  it("creates a private squad group for the actor", async () => {
    const member = await createVerifiedMember({ id: "effect-create-owner" });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const service = new CreateSquadGroup();

    const created = await runtime.runPromise(
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
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const service = new CreateSquadGroup();
    const listService = new ListSquadGroups();

    await runtime.runPromise(
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "First listed group",
      })
    );
    await runtime.runPromise(
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "Second listed group",
      })
    );
    await runtime.runPromise(
      service.create({
        actorUserId: parseTestUserId(other.id),
        name: "Other listed group",
      })
    );

    const groups = await runtime.runPromise(
      listService.listMine({ actorUserId: parseTestUserId(member.id) })
    );

    const groupNames = groups.map((group) => group.name);

    expect(groupNames).toContain("First listed group");
    expect(groupNames).toContain("Second listed group");
    expect(groupNames).not.toContain("Other listed group");
  });

  it("loads a squad group detail for the owner", async () => {
    const member = await createVerifiedMember({ id: "effect-detail-owner" });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const service = new CreateSquadGroup();
    const listService = new ListSquadGroups();

    const created = await runtime.runPromise(
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect detail group",
      })
    );

    const detail = await runtime.runPromise(
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

  it("lists available Jaruna characters for the squad group owner", async () => {
    const member = await createVerifiedMember({ id: "effect-available-owner" });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const service = new CreateSquadGroup();
    const listService = new ListAvailableSquadCharacters();

    const created = await runtime.runPromise(
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

    const characters = await runtime.runPromise(
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
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const service = new ListOwnedMargonemAccounts();

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

    const accounts = await runtime.runPromise(
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
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const displayName = parseAccountDisplayName("Effect pending");

    if (!isOk(displayName)) {
      throw new Error("Expected display name to be valid");
    }

    const pending = await runtime.runPromise(
      EffectSquadGroupStore.use((store) =>
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
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
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

    const loaded = await runtime.runPromise(
      EffectSquadGroupStore.use((store) =>
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
    const pending = await runtime.runPromise(
      EffectSquadGroupStore.use((store) =>
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

  it("confirms pending account imports through the Effect store", async () => {
    const member = await createVerifiedMember({ id: "effect-confirm-user" });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const service = new EffectConfirmOwnedAccountImport(systemClock);
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

    const confirmed = await runtime.runPromise(
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
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const profileId = parseTestProfileId(8_100_201);
    const yearMonth = firecrawlYearMonthFromDate(
      new Date("2026-06-29T12:00:00.000Z")
    );

    const reserved = await runtime.runPromise(
      EffectSquadGroupStore.use((store) =>
        store.reserveRequest({
          monthlyRequestBudget: 10,
          profileId,
          requestedByUserId: parseTestUserId(member.id),
          yearMonth,
        })
      )
    );

    await runtime.runPromise(
      EffectSquadGroupStore.use((store) =>
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
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const createService = new CreateSquadGroup();
    const visibilityService = new SetSquadGroupVisibility(systemClock);

    const created = await runtime.runPromise(
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect visibility group",
      })
    );

    const changed = await runtime.runPromise(
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

  it("lists globally visible squad groups", async () => {
    const member = await createVerifiedMember({ id: "effect-global-owner" });
    const other = await createVerifiedMember({ id: "effect-global-other" });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const createService = new CreateSquadGroup();
    const visibilityService = new SetSquadGroupVisibility(systemClock);
    const listGlobalService = new ListGlobalSquadGroups();

    const globalGroup = await runtime.runPromise(
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect global group",
      })
    );
    await runtime.runPromise(
      visibilityService.set({
        actorUserId: parseTestUserId(member.id),
        groupId: globalGroup.groupId,
        visibility: "global",
      })
    );
    await runtime.runPromise(
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect private group",
      })
    );

    const groups = await runtime.runPromise(
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
