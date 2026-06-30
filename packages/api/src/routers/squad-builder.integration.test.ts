import { createRouterClient } from "@orpc/server";
import { margonemAccount } from "@tepirek-revamped/db/schema/squad-builder";
import { describe, expect, it } from "vitest";

import { makeApiManagedRuntime } from "../effect-app";
import { parseAccountDisplayName } from "../modules/squad-builder/account-display-name";
import { ConfirmOwnedAccountImport } from "../modules/squad-builder/account-import/confirm-owned-account-import";
import { ListOwnedMargonemAccounts } from "../modules/squad-builder/account-import/list-owned-margonem-accounts";
import { systemClock } from "../modules/squad-builder/account-import/preview-margonem-profile-import";
import type { PreviewOwnedAccountImportItem } from "../modules/squad-builder/account-import/preview-owned-account-imports";
import { ListAccountSharingState } from "../modules/squad-builder/account-sharing/list-account-sharing-state";
import { RespondToAccountAccessInvite } from "../modules/squad-builder/account-sharing/respond-to-account-access-invite";
import { RevokeAccountAccess } from "../modules/squad-builder/account-sharing/revoke-account-access";
import { SearchAccountInviteTargets } from "../modules/squad-builder/account-sharing/search-account-invite-targets";
import { SendAccountAccessInvite } from "../modules/squad-builder/account-sharing/send-account-access-invite";
import { parseAppUserId } from "../modules/squad-builder/app-user-id";
import { parseFirecrawlCreditCount } from "../modules/squad-builder/firecrawl-config";
import { parseMargonemProfileId } from "../modules/squad-builder/margonem-profile-id";
import { pendingImportIdToNumber } from "../modules/squad-builder/pending-margonem-account-import-id";
import { isOk, ok } from "../modules/squad-builder/result";
import { DrizzleSquadBuilderStore } from "../modules/squad-builder/squad-builder-store";
import { createVerifiedMember } from "../test/integration/builders";
import type { TestUser } from "../test/integration/builders";
import { defaultTestDatabaseUrl, testDb } from "../test/integration/database";
import type { AppRouter } from "./index";
import type { RouterContext } from "./procedures";
import { createSquadBuilderRouter } from "./squad-builder";

const parseTestUserId = (value: string) => {
  const id = parseAppUserId(value);
  if (!isOk(id)) {
    throw new Error("Expected user id to be valid");
  }
  return id.value;
};

const parseTestProfileId = (value = 7_298_897) => {
  const id = parseMargonemProfileId(value);
  if (!isOk(id)) {
    throw new Error("Expected profile id to be valid");
  }
  return id.value;
};

const parseTestCredits = (value = 1) => {
  const credits = parseFirecrawlCreditCount(value);
  if (!isOk(credits)) {
    throw new Error("Expected credits to be valid");
  }
  return credits.value;
};

const buildStoreBackedServices = () => {
  const store = new DrizzleSquadBuilderStore();
  return {
    confirm: new ConfirmOwnedAccountImport(store, store, systemClock),
    list: new ListOwnedMargonemAccounts(store),
    respondInvite: new RespondToAccountAccessInvite(store, systemClock),
    revokeAccess: new RevokeAccountAccess(store, systemClock),
    searchInviteTargets: new SearchAccountInviteTargets(store),
    sendInvite: new SendAccountAccessInvite(store, systemClock),
    sharingState: new ListAccountSharingState(store),
    store,
  };
};

const stubLogger = {
  debug: () => {},
  error: () => {},
  info: () => {},
  warn: () => {},
} as unknown as RouterContext["logger"];

const createSquadBuilderClient = (
  user: TestUser,
  overrides: Parameters<typeof createSquadBuilderRouter>[0]
) => {
  const squadBuilder = createSquadBuilderRouter(overrides);
  return createRouterClient({ squadBuilder } as unknown as AppRouter, {
    context: {
      logger: stubLogger,
      session: {
        session: {
          id: `${user.id}-session`,
          token: `${user.id}-token`,
          userId: user.id,
        },
        user: {
          id: user.id,
          role: user.role,
          verified: user.verified,
        },
      },
    } as RouterContext,
  });
};

const seedPendingImport = async (
  store: DrizzleSquadBuilderStore,
  actorUserId: string,
  profileId: number,
  characterName = "informati"
) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60_000);
  const displayName = parseAccountDisplayName(characterName);
  if (!isOk(displayName)) {
    throw new Error("Expected display name to be valid");
  }

  const created = await store.createPendingImport({
    actorUserId: parseTestUserId(actorUserId),
    defaultDisplayName: displayName.value,
    expiresAt,
    fetchedAt: now,
    firecrawlCreditsUsed: parseTestCredits(),
    generatedProfileUrl: `https://www.margonem.pl/profile/view,${profileId}`,
    jarunaCharacters: [
      {
        avatarUrl: null,
        characterId: 1_296_625 as never,
        level: 315 as never,
        name: characterName,
        profession: "tracker",
        world: "jaruna",
      },
    ],
    profileId: parseTestProfileId(profileId),
    suggestedAccountName: characterName,
  });

  if (!isOk(created)) {
    throw new Error("Expected pending import to be created");
  }

  return created.value.id;
};

const fakePreviewItems = (
  pendingImportId: number
): readonly PreviewOwnedAccountImportItem[] => {
  const displayName = parseAccountDisplayName("informati");
  if (!isOk(displayName)) {
    throw new Error("Expected display name to be valid");
  }

  return [
    {
      _tag: "PreviewSucceeded",
      defaultDisplayName: displayName.value,
      firecrawlCreditsUsed: parseTestCredits(),
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      inputUrl: "https://www.margonem.pl/profile/view,7298897",
      jarunaCharacters: [
        {
          avatarUrl: null,
          characterId: 1_296_625 as never,
          level: 315 as never,
          name: "informati",
          profession: "tracker",
          world: "jaruna",
        },
      ],
      lastFetchedAt: new Date("2026-06-29T12:00:00.000Z"),
      lineNumber: 1,
      pendingImportId: pendingImportId as never,
      profileId: parseTestProfileId(),
      suggestedAccountName: "informati",
    },
    {
      _tag: "PreviewFailed",
      error: { _tag: "DuplicateProfileInBatch", firstLineNumber: 1 },
      inputUrl: "https://www.margonem.pl/profile/view,7298897",
      lineNumber: 2,
    },
  ];
};

describe("squad-builder router Postgres integration", () => {
  it("creates a squad group through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "router-effect-create" });
    const client = createSquadBuilderClient(member, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const group = await client.squadBuilder.createSquadGroup({
      name: "  Router Effect group  ",
    });

    expect(group).toMatchObject({
      characterCount: 0,
      name: "Router Effect group",
      squadCount: 0,
    });
  });

  it("maps an invalid Effect squad group name to BAD_REQUEST", async () => {
    const member = await createVerifiedMember({ id: "router-effect-invalid" });
    const client = createSquadBuilderClient(member, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    await expect(
      client.squadBuilder.createSquadGroup({ name: "   " })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lists my squad groups through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "router-effect-list" });
    const other = await createVerifiedMember({
      id: "router-effect-list-other",
    });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const client = createSquadBuilderClient(member, { effectRuntime: runtime });
    const otherClient = createSquadBuilderClient(other, {
      effectRuntime: runtime,
    });

    await client.squadBuilder.createSquadGroup({ name: "Router listed one" });
    await client.squadBuilder.createSquadGroup({ name: "Router listed two" });
    await otherClient.squadBuilder.createSquadGroup({
      name: "Router hidden other",
    });

    const listed = await client.squadBuilder.listMySquadGroups();
    const groupNames = listed.groups.map((group) => group.name);

    expect(groupNames).toContain("Router listed one");
    expect(groupNames).toContain("Router listed two");
    expect(groupNames).not.toContain("Router hidden other");
  });

  it("loads squad group detail through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "router-effect-detail" });
    const client = createSquadBuilderClient(member, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const created = await client.squadBuilder.createSquadGroup({
      name: "Router detail group",
    });
    const detail = await client.squadBuilder.getSquadGroupDetail({
      groupId: created.groupId,
    });

    expect(detail).toMatchObject({
      accessRole: "owner",
      groupId: created.groupId,
      name: "Router detail group",
      squads: [],
      visibility: "private",
    });
  });

  it("returns per-line owned account import preview results for a verified user", async () => {
    const member = await createVerifiedMember({ id: "preview-member" });
    const client = createSquadBuilderClient(member, {
      previewOwnedImportsService: {
        preview: () => Promise.resolve(ok({ items: fakePreviewItems(999) })),
      },
    });

    const result = await client.squadBuilder.previewOwnedAccountImports({
      profileUrls: [
        "https://www.margonem.pl/profile/view,7298897",
        "https://www.margonem.pl/profile/view,7298897",
      ],
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      characterCount: 1,
      lineNumber: 1,
      pendingImportId: 999,
      status: "success",
      suggestedAccountName: "informati",
    });
    expect(result.items[1]).toMatchObject({
      errorTag: "DuplicateProfileInBatch",
      lineNumber: 2,
      message: "Ten profil już występuje wyżej w liście.",
      status: "error",
    });
  });

  it("confirms a pending import and lists it as an owned account", async () => {
    const member = await createVerifiedMember({ id: "confirm-member" });
    const { confirm, list, store } = buildStoreBackedServices();
    const client = createSquadBuilderClient(member, {
      confirmOwnedAccountImportService: confirm,
      listOwnedAccountsService: list,
    });

    const pendingImportId = await seedPendingImport(
      store,
      member.id,
      7_298_897
    );

    const confirmed = await client.squadBuilder.confirmOwnedAccountImport({
      displayName: "informati",
      pendingImportId: pendingImportIdToNumber(pendingImportId),
    });

    expect(confirmed).toMatchObject({
      characterCount: 1,
      displayName: "informati",
      profileId: 7_298_897,
    });

    const listed = await client.squadBuilder.listOwnedAccounts();

    expect(listed.accounts).toHaveLength(1);
    expect(listed.accounts[0]).toMatchObject({
      characterCount: 1,
      displayName: "informati",
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      profileId: 7_298_897,
    });
  });

  it("returns CONFLICT when confirming a pending import for an already saved profile", async () => {
    const owner = await createVerifiedMember({ id: "confirm-owner" });
    const other = await createVerifiedMember({ id: "confirm-other" });
    const { confirm, store } = buildStoreBackedServices();
    const otherClient = createSquadBuilderClient(other, {
      confirmOwnedAccountImportService: confirm,
    });

    await testDb.insert(margonemAccount).values({
      displayName: "Zajęte konto",
      ownerUserId: owner.id,
      profileId: 7_298_900,
    });

    const pendingImportId = await seedPendingImport(store, other.id, 7_298_900);

    await expect(
      otherClient.squadBuilder.confirmOwnedAccountImport({
        displayName: "informati",
        pendingImportId: pendingImportIdToNumber(pendingImportId),
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects an invalid display name with BAD_REQUEST", async () => {
    const member = await createVerifiedMember({ id: "confirm-invalid-name" });
    const { confirm, store } = buildStoreBackedServices();
    const client = createSquadBuilderClient(member, {
      confirmOwnedAccountImportService: confirm,
    });

    const pendingImportId = await seedPendingImport(
      store,
      member.id,
      7_298_901
    );

    await expect(
      client.squadBuilder.confirmOwnedAccountImport({
        displayName: "   ",
        pendingImportId: pendingImportIdToNumber(pendingImportId),
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns NOT_FOUND when confirming an expired or missing pending import", async () => {
    const member = await createVerifiedMember({ id: "confirm-missing" });
    const { confirm } = buildStoreBackedServices();
    const client = createSquadBuilderClient(member, {
      confirmOwnedAccountImportService: confirm,
    });

    await expect(
      client.squadBuilder.confirmOwnedAccountImport({
        displayName: "informati",
        pendingImportId: 1_234_567,
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists only the actor's owned accounts", async () => {
    const first = await createVerifiedMember({ id: "list-first" });
    const second = await createVerifiedMember({ id: "list-second" });
    const { confirm, list, store } = buildStoreBackedServices();
    const firstClient = createSquadBuilderClient(first, {
      confirmOwnedAccountImportService: confirm,
      listOwnedAccountsService: list,
    });
    const secondClient = createSquadBuilderClient(second, {
      confirmOwnedAccountImportService: confirm,
      listOwnedAccountsService: list,
    });

    const firstPending = await seedPendingImport(store, first.id, 7_298_910);
    await firstClient.squadBuilder.confirmOwnedAccountImport({
      displayName: "Konto pierwszego",
      pendingImportId: pendingImportIdToNumber(firstPending),
    });

    const secondPending = await seedPendingImport(store, second.id, 7_298_911);
    await secondClient.squadBuilder.confirmOwnedAccountImport({
      displayName: "Konto drugiego",
      pendingImportId: pendingImportIdToNumber(secondPending),
    });

    const firstAccounts = await firstClient.squadBuilder.listOwnedAccounts();
    const secondAccounts = await secondClient.squadBuilder.listOwnedAccounts();

    expect(firstAccounts.accounts).toHaveLength(1);
    expect(firstAccounts.accounts[0]?.profileId).toBe(7_298_910);
    expect(secondAccounts.accounts).toHaveLength(1);
    expect(secondAccounts.accounts[0]?.profileId).toBe(7_298_911);
  });

  it("sends an account access invite and returns CONFLICT when re-sent", async () => {
    const owner = await createVerifiedMember({
      id: "router-invite-owner",
      name: "Router Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-invite-recipient",
      name: "Router Recipient",
    });
    const { sendInvite } = buildStoreBackedServices();
    const client = createSquadBuilderClient(owner, {
      sendAccountAccessInviteService: sendInvite,
    });

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Router account",
        ownerUserId: owner.id,
        profileId: 7_299_001,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const invite = await client.squadBuilder.sendAccountAccessInvite({
      accountId: account.id,
      invitedUserId: recipient.id,
    });

    expect(invite).toMatchObject({
      accountId: account.id,
      ownerUserName: "Router Owner",
      status: "pending",
    });

    await expect(
      client.squadBuilder.sendAccountAccessInvite({
        accountId: account.id,
        invitedUserId: recipient.id,
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns FORBIDDEN when revoking access for an account the actor does not own", async () => {
    const owner = await createVerifiedMember({ id: "router-revoke-owner" });
    const attacker = await createVerifiedMember({
      id: "router-revoke-attacker",
    });
    const recipient = await createVerifiedMember({
      id: "router-revoke-recipient",
    });
    const { sendInvite, revokeAccess } = buildStoreBackedServices();
    const ownerClient = createSquadBuilderClient(owner, {
      sendAccountAccessInviteService: sendInvite,
    });
    const attackerClient = createSquadBuilderClient(attacker, {
      revokeAccountAccessService: revokeAccess,
    });

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Revoke account",
        ownerUserId: owner.id,
        profileId: 7_299_002,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const invite = await ownerClient.squadBuilder.sendAccountAccessInvite({
      accountId: account.id,
      invitedUserId: recipient.id,
    });

    await expect(
      attackerClient.squadBuilder.revokeAccountAccess({
        accessId: invite.accessId,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("accepts an invite and shows the account under shared-with-me", async () => {
    const owner = await createVerifiedMember({
      id: "router-accept-owner",
      name: "Accept Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-accept-recipient",
    });
    const { sendInvite, respondInvite, sharingState } =
      buildStoreBackedServices();
    const ownerClient = createSquadBuilderClient(owner, {
      sendAccountAccessInviteService: sendInvite,
    });
    const recipientClient = createSquadBuilderClient(recipient, {
      listAccountSharingStateService: sharingState,
      respondToAccountAccessInviteService: respondInvite,
    });

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Accept account",
        ownerUserId: owner.id,
        profileId: 7_299_003,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const invite = await ownerClient.squadBuilder.sendAccountAccessInvite({
      accountId: account.id,
      invitedUserId: recipient.id,
    });

    const accepted =
      await recipientClient.squadBuilder.respondToAccountAccessInvite({
        accessId: invite.accessId,
        response: "accept",
      });

    expect(accepted.status).toBe("accepted");

    const shared = await recipientClient.squadBuilder.listSharedAccounts();
    expect(shared.accounts).toHaveLength(1);
    expect(shared.accounts[0]).toMatchObject({
      accountId: account.id,
      ownerUserName: "Accept Owner",
    });
  });

  it("searches verified invite targets and excludes the owner", async () => {
    const owner = await createVerifiedMember({
      id: "router-search-owner",
      name: "Search Owner",
    });
    const target = await createVerifiedMember({
      id: "router-search-target",
      name: "Search Target",
    });
    const { searchInviteTargets } = buildStoreBackedServices();
    const client = createSquadBuilderClient(owner, {
      searchAccountInviteTargetsService: searchInviteTargets,
    });

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Search account",
        ownerUserId: owner.id,
        profileId: 7_299_004,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const result = await client.squadBuilder.searchAccountInviteTargets({
      accountId: account.id,
      query: "Search",
    });

    const foundIds = result.users.map((user) => user.userId);
    expect(foundIds).toContain(target.id);
    expect(foundIds).not.toContain(owner.id);
  });
});
