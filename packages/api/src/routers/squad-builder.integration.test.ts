import { createRouterClient } from "@orpc/server";
import {
  margonemAccount,
  margonemAccountAccess,
  margonemAccountRefetchPreview,
  margonemCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vitest";

import { makeApiManagedRuntime } from "../effect-app.js";
import { parseAccountDisplayName } from "../modules/squad-builder/account-display-name.js";
import { ConfirmOwnedAccountImport } from "../modules/squad-builder/account-import/confirm-owned-account-import.js";
import { EffectConfirmOwnedAccountImport } from "../modules/squad-builder/account-import/effect-confirm-owned-account-import.js";
import { ListOwnedMargonemAccounts } from "../modules/squad-builder/account-import/list-owned-margonem-accounts.js";
import { systemClock } from "../modules/squad-builder/account-import/preview-margonem-profile-import.js";
import { DuplicateProfileInBatchError } from "../modules/squad-builder/account-import/preview-owned-account-imports.js";
import type { PreviewOwnedAccountImportItem } from "../modules/squad-builder/account-import/preview-owned-account-imports.js";
import { EffectApplyAccountRefetch } from "../modules/squad-builder/account-refetch/effect-apply-account-refetch.js";
import { EffectListAccountSharingState } from "../modules/squad-builder/account-sharing/effect-list-account-sharing-state.js";
import { EffectRespondToAccountAccessInvite } from "../modules/squad-builder/account-sharing/effect-respond-to-account-access-invite.js";
import { EffectSearchAccountInviteTargets } from "../modules/squad-builder/account-sharing/effect-search-account-invite-targets.js";
import { EffectSendAccountAccessInvite } from "../modules/squad-builder/account-sharing/effect-send-account-access-invite.js";
import { ListAccountSharingState } from "../modules/squad-builder/account-sharing/list-account-sharing-state.js";
import { RespondToAccountAccessInvite } from "../modules/squad-builder/account-sharing/respond-to-account-access-invite.js";
import { RevokeAccountAccess } from "../modules/squad-builder/account-sharing/revoke-account-access.js";
import { SearchAccountInviteTargets } from "../modules/squad-builder/account-sharing/search-account-invite-targets.js";
import { SendAccountAccessInvite } from "../modules/squad-builder/account-sharing/send-account-access-invite.js";
import { parseAppUserId } from "../modules/squad-builder/app-user-id.js";
import { parseFirecrawlCreditCount } from "../modules/squad-builder/firecrawl-config.js";
import { parseMargonemProfileId } from "../modules/squad-builder/margonem-profile-id.js";
import { pendingImportIdToNumber } from "../modules/squad-builder/pending-margonem-account-import-id.js";
import { isOk, ok } from "../modules/squad-builder/result.js";
import { DrizzleSquadBuilderStore } from "../modules/squad-builder/squad-builder-store.js";
import { EffectListSquadGroupSharingState } from "../modules/squad-builder/squad-groups/effect-list-squad-group-sharing-state.js";
import { EffectRespondToSquadGroupInvite } from "../modules/squad-builder/squad-groups/effect-respond-to-squad-group-invite.js";
import { EffectRevokeSquadGroupEditor } from "../modules/squad-builder/squad-groups/effect-revoke-squad-group-editor.js";
import { EffectSendSquadGroupEditorInvite } from "../modules/squad-builder/squad-groups/effect-send-squad-group-editor-invite.js";
import { EffectSquadBuilderPersistenceUnavailable } from "../modules/squad-builder/squad-groups/squad-group-errors.js";
import { createVerifiedMember } from "../test/integration/builders.js";
import type { TestUser } from "../test/integration/builders.js";
import {
  defaultTestDatabaseUrl,
  testDb,
} from "../test/integration/database.js";
import type { AppRouter } from "./index.js";
import type { RouterContext } from "./procedures.js";
import { createSquadBuilderRouter } from "./squad-builder.js";

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
    list: new ListOwnedMargonemAccounts(),
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
  overrides: Parameters<typeof createSquadBuilderRouter>[0],
  logger: RouterContext["logger"] = stubLogger
) => {
  const squadBuilder = createSquadBuilderRouter(overrides);
  return createRouterClient({ squadBuilder } as unknown as AppRouter, {
    context: {
      logger,
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
      error: new DuplicateProfileInBatchError({ firstLineNumber: 1 }),
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

  it("logs safe Effect failure summaries through the request logger", async () => {
    const member = await createVerifiedMember({ id: "router-effect-log" });
    const logError = vi.fn();
    const logger = {
      debug: () => {},
      error: logError,
      info: () => {},
      warn: () => {},
    } as unknown as RouterContext["logger"];
    const client = createSquadBuilderClient(
      member,
      {
        createSquadGroupService: {
          create: () =>
            Effect.fail(
              new EffectSquadBuilderPersistenceUnavailable({
                cause: new Error("database unavailable"),
                operation: "createSquadGroup",
                provider: "postgres",
              })
            ),
        },
        effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
      },
      logger
    );

    await expect(
      client.squadBuilder.createSquadGroup({ name: "Will fail" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

    expect(logError).toHaveBeenCalledWith("Squad builder operation failed", {
      squadBuilder: {
        dependency: "postgres",
        errorTag: "SquadBuilderPersistenceUnavailable",
        operation: "createSquadGroup",
      },
    });
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

  it("saves a squad group through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "router-effect-save" });
    const client = createSquadBuilderClient(member, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const created = await client.squadBuilder.createSquadGroup({
      name: "Router save original",
    });
    const saved = await client.squadBuilder.saveSquadGroup({
      groupId: created.groupId,
      name: "Router save updated",
      squads: [
        {
          characters: [],
          clientKey: "router-squad",
          name: "Router squad",
          position: 0,
        },
      ],
    });

    expect(saved).toMatchObject({
      accessRole: "owner",
      groupId: created.groupId,
      name: "Router save updated",
      squads: [{ characters: [], name: "Router squad", position: 0 }],
    });
  });

  it("saves shared squad group characters through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({
      id: "router-effect-save-shared",
    });
    const client = createSquadBuilderClient(member, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Router shared account",
        ownerUserId: member.id,
        profileId: 8_200_003,
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
        characterId: 1_296_627,
        level: 301,
        name: "sharedrouterchar",
        profession: "tracker",
        world: "jaruna",
      })
      .returning({ id: margonemCharacter.id });

    if (character === undefined) {
      throw new Error("Failed to seed character");
    }

    const created = await client.squadBuilder.createSquadGroup({
      name: "Router shared save group",
    });
    const savedStructure = await client.squadBuilder.saveSquadGroup({
      groupId: created.groupId,
      name: "Router shared save group",
      squads: [
        {
          characters: [],
          clientKey: "shared-router-squad",
          name: "Shared router squad",
          position: 0,
        },
      ],
    });
    const squadId = savedStructure.squads[0]?.squadId;

    if (squadId === undefined) {
      throw new Error("Expected saved squad id");
    }

    const saved = await client.squadBuilder.saveSharedSquadGroupCharacters({
      groupId: created.groupId,
      squads: [
        {
          characters: [{ characterId: character.id, position: 0 }],
          squadId,
        },
      ],
    });

    expect(saved).toMatchObject({
      accessRole: "owner",
      groupId: created.groupId,
      squads: [
        {
          characters: [{ characterId: character.id, name: "sharedrouterchar" }],
          squadId,
        },
      ],
    });
  });

  it("lists available squad characters through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({
      id: "router-effect-available",
    });
    const client = createSquadBuilderClient(member, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const created = await client.squadBuilder.createSquadGroup({
      name: "Router available group",
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Router available account",
        ownerUserId: member.id,
        profileId: 8_200_001,
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
        characterId: 1_296_626,
        level: 300,
        name: "routerchar",
        profession: "tracker",
        world: "jaruna",
      })
      .returning({ id: margonemCharacter.id });

    if (character === undefined) {
      throw new Error("Failed to seed character");
    }

    const listed = await client.squadBuilder.listAvailableSquadCharacters({
      groupId: created.groupId,
    });

    expect(listed.characters).toHaveLength(1);
    expect(listed.characters[0]).toMatchObject({
      accountId: account.id,
      characterId: character.id,
      name: "routerchar",
      profession: "tracker",
    });
  });

  it("changes squad group visibility through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({
      id: "router-effect-visibility",
    });
    const client = createSquadBuilderClient(member, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const created = await client.squadBuilder.createSquadGroup({
      name: "Router visibility group",
    });
    const changed = await client.squadBuilder.setSquadGroupVisibility({
      groupId: created.groupId,
      visibility: "global",
    });

    expect(changed).toMatchObject({
      groupId: created.groupId,
      visibility: "global",
    });
  });

  it("lists global squad groups through the Effect oRPC bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-global-owner",
      name: "Global Owner",
    });
    const viewer = await createVerifiedMember({
      id: "router-effect-global-viewer",
    });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const ownerClient = createSquadBuilderClient(owner, {
      effectRuntime: runtime,
    });
    const viewerClient = createSquadBuilderClient(viewer, {
      effectRuntime: runtime,
    });

    const globalGroup = await ownerClient.squadBuilder.createSquadGroup({
      name: "Router global group",
    });
    await ownerClient.squadBuilder.setSquadGroupVisibility({
      groupId: globalGroup.groupId,
      visibility: "global",
    });
    await ownerClient.squadBuilder.createSquadGroup({
      name: "Router private group",
    });

    const listed = await viewerClient.squadBuilder.listGlobalSquadGroups({});
    const groupNames = listed.groups.map((group) => group.name);

    expect(groupNames).toContain("Router global group");
    expect(groupNames).not.toContain("Router private group");
    expect(
      listed.groups.find((group) => group.groupId === globalGroup.groupId)
    ).toMatchObject({
      ownerUserName: "Global Owner",
    });
  });

  it("previews a single account import through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "preview-effect-member" });
    const client = createSquadBuilderClient(member, {
      effectPreviewService: {
        preview: () =>
          Effect.succeed({
            firecrawlCreditsUsed: parseTestCredits(),
            generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
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
            profileId: parseTestProfileId(),
            suggestedAccountName: "informati",
          }),
      },
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const result = await client.squadBuilder.previewProfileImport({
      profileUrl: "https://www.margonem.pl/profile/view,7298897",
    });

    expect(result).toMatchObject({
      firecrawlCreditsUsed: 1,
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      profileId: 7_298_897,
      suggestedAccountName: "informati",
    });
    expect(result.jarunaCharacters).toHaveLength(1);
  });

  it("previews owned account imports through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "preview-owned-effect" });
    const client = createSquadBuilderClient(member, {
      effectPreviewOwnedImportsService: {
        preview: () => Effect.succeed({ items: fakePreviewItems(998) }),
      },
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const result = await client.squadBuilder.previewOwnedAccountImports({
      profileUrls: [
        "https://www.margonem.pl/profile/view,7298897",
        "https://www.margonem.pl/profile/view,7298897",
      ],
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      lineNumber: 1,
      pendingImportId: 998,
      status: "success",
    });
    expect(result.items[1]).toMatchObject({
      errorTag: "DuplicateProfileInBatch",
      lineNumber: 2,
      status: "error",
    });
  });

  it("previews account refetch through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "refetch-effect-member" });
    const client = createSquadBuilderClient(member, {
      effectPreviewAccountRefetchService: {
        preview: (input) =>
          Effect.succeed({
            accountId: input.accountId,
            diff: {
              accountId: input.accountId,
              added: [],
              changed: [],
              fetchedAt: new Date("2026-06-29T12:00:00.000Z"),
              profileId: parseTestProfileId(),
              removed: [],
              unchangedCount: 1,
            },
            fetchedAt: new Date("2026-06-29T12:00:00.000Z"),
            firecrawlCreditsUsed: parseTestCredits(),
            generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
            profileId: parseTestProfileId(),
            refetchPreviewId: 456 as never,
          }),
      },
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });

    const result = await client.squadBuilder.previewAccountRefetch({
      accountId: 123,
    });

    expect(result).toMatchObject({
      accountId: 123,
      diff: { unchangedCount: 1 },
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
      profileId: 7_298_897,
      refetchPreviewId: 456,
    });
  });

  it("applies account refetch through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "apply-effect-member" });
    const client = createSquadBuilderClient(member, {
      effectApplyAccountRefetchService: new EffectApplyAccountRefetch(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Router apply account",
        ownerUserId: member.id,
        profileId: 8_200_002,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const [pending] = await testDb
      .insert(margonemAccountRefetchPreview)
      .values({
        accountId: account.id,
        actorUserId: member.id,
        diffJson: "{}",
        expiresAt: new Date("2099-06-29T12:30:00.000Z"),
        fetchedAt: new Date("2026-06-29T12:00:00.000Z"),
        firecrawlCreditsUsed: 1,
        profileId: 8_200_002,
      })
      .returning({ id: margonemAccountRefetchPreview.id });

    if (pending === undefined) {
      throw new Error("Failed to seed pending refetch");
    }

    const result = await client.squadBuilder.applyAccountRefetch({
      refetchPreviewId: pending.id,
    });

    expect(result).toMatchObject({
      accountId: account.id,
      addedCharacterCount: 0,
      profileId: 8_200_002,
      removedCharacterCount: 0,
      removedSquadCharacterCount: 0,
      updatedCharacterCount: 0,
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

  it("confirms a pending import through the Effect oRPC bridge", async () => {
    const member = await createVerifiedMember({ id: "confirm-effect-member" });
    const { store } = buildStoreBackedServices();
    const client = createSquadBuilderClient(member, {
      effectConfirmOwnedAccountImportService:
        new EffectConfirmOwnedAccountImport(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const pendingImportId = await seedPendingImport(
      store,
      member.id,
      7_298_899
    );

    const confirmed = await client.squadBuilder.confirmOwnedAccountImport({
      displayName: "  Effect informati  ",
      pendingImportId: pendingImportIdToNumber(pendingImportId),
    });

    expect(confirmed).toMatchObject({
      characterCount: 1,
      displayName: "Effect informati",
      generatedProfileUrl: "https://www.margonem.pl/profile/view,7298899",
      profileId: 7_298_899,
    });
  });

  it("confirms a pending import and lists it as an owned account", async () => {
    const member = await createVerifiedMember({ id: "confirm-member" });
    const { confirm, list, store } = buildStoreBackedServices();
    const client = createSquadBuilderClient(member, {
      confirmOwnedAccountImportService: confirm,
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
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
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
      listOwnedAccountsService: list,
    });
    const secondClient = createSquadBuilderClient(second, {
      confirmOwnedAccountImportService: confirm,
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
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

  it("sends an account access invite through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-invite-owner",
      name: "Router Effect Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-invite-recipient",
      name: "Router Effect Recipient",
    });
    const client = createSquadBuilderClient(owner, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
      effectSendAccountAccessInviteService: new EffectSendAccountAccessInvite(),
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Router effect account",
        ownerUserId: owner.id,
        profileId: 7_299_008,
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
      ownerUserName: "Router Effect Owner",
      status: "pending",
    });
  });

  it("sends a squad group editor invite through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-squad-invite-owner",
      name: "Router Effect Squad Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-squad-invite-recipient",
      name: "Router Effect Squad Recipient",
    });
    const client = createSquadBuilderClient(owner, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
      effectSendSquadGroupEditorInviteService:
        new EffectSendSquadGroupEditorInvite(),
    });
    const group = await client.squadBuilder.createSquadGroup({
      name: "Router effect squad invite group",
    });

    const invite = await client.squadBuilder.sendSquadGroupEditorInvite({
      groupId: group.groupId,
      invitedUserId: recipient.id,
    });

    expect(invite).toMatchObject({
      ownerUserName: "Router Effect Squad Owner",
      squadGroupId: group.groupId,
      status: "pending",
    });
  });

  it("responds to a squad group editor invite through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-squad-respond-owner",
      name: "Router Effect Squad Respond Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-squad-respond-recipient",
      name: "Router Effect Squad Respond Recipient",
    });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const ownerClient = createSquadBuilderClient(owner, {
      effectRuntime: runtime,
      effectSendSquadGroupEditorInviteService:
        new EffectSendSquadGroupEditorInvite(),
    });
    const recipientClient = createSquadBuilderClient(recipient, {
      effectRespondToSquadGroupInviteService:
        new EffectRespondToSquadGroupInvite(),
      effectRuntime: runtime,
    });
    const group = await ownerClient.squadBuilder.createSquadGroup({
      name: "Router effect squad respond group",
    });
    const invite = await ownerClient.squadBuilder.sendSquadGroupEditorInvite({
      groupId: group.groupId,
      invitedUserId: recipient.id,
    });

    const accepted =
      await recipientClient.squadBuilder.respondToSquadGroupInvite({
        invitationId: invite.invitationId,
        response: "accept",
      });

    expect(accepted).toMatchObject({
      invitationId: invite.invitationId,
      squadGroupId: group.groupId,
      status: "accepted",
    });
  });

  it("revokes a squad group editor invite through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-squad-revoke-owner",
      name: "Router Effect Squad Revoke Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-squad-revoke-recipient",
      name: "Router Effect Squad Revoke Recipient",
    });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const ownerClient = createSquadBuilderClient(owner, {
      effectRevokeSquadGroupEditorService: new EffectRevokeSquadGroupEditor(),
      effectRuntime: runtime,
      effectSendSquadGroupEditorInviteService:
        new EffectSendSquadGroupEditorInvite(),
    });
    const group = await ownerClient.squadBuilder.createSquadGroup({
      name: "Router effect squad revoke group",
    });
    const invite = await ownerClient.squadBuilder.sendSquadGroupEditorInvite({
      groupId: group.groupId,
      invitedUserId: recipient.id,
    });

    const revoked = await ownerClient.squadBuilder.revokeSquadGroupEditor({
      invitationId: invite.invitationId,
    });

    expect(revoked).toMatchObject({
      invitationId: invite.invitationId,
      squadGroupId: group.groupId,
      status: "revoked",
    });
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

  it("accepts an invite through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-accept-owner",
      name: "Effect Accept Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-accept-recipient",
    });
    const runtime = makeApiManagedRuntime(defaultTestDatabaseUrl);
    const ownerClient = createSquadBuilderClient(owner, {
      effectRuntime: runtime,
      effectSendAccountAccessInviteService: new EffectSendAccountAccessInvite(),
    });
    const recipientClient = createSquadBuilderClient(recipient, {
      effectListAccountSharingStateService: new EffectListAccountSharingState(),
      effectRespondToAccountAccessInviteService:
        new EffectRespondToAccountAccessInvite(),
      effectRuntime: runtime,
    });

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect accept account",
        ownerUserId: owner.id,
        profileId: 7_299_010,
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

    expect(accepted).toMatchObject({
      accessId: invite.accessId,
      status: "accepted",
    });

    const shared = await recipientClient.squadBuilder.listSharedAccounts();

    expect(shared.accounts).toHaveLength(1);
    expect(shared.accounts[0]).toMatchObject({
      accountId: account.id,
      ownerUserName: "Effect Accept Owner",
    });
  });

  it("lists incoming account invites through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-list-invites-owner",
      name: "Effect Incoming Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-list-invites-recipient",
    });
    const client = createSquadBuilderClient(recipient, {
      effectListAccountSharingStateService: new EffectListAccountSharingState(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect incoming account",
        ownerUserId: owner.id,
        profileId: 7_299_011,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    await testDb.insert(margonemAccountAccess).values({
      accountId: account.id,
      invitedByUserId: owner.id,
      status: "pending",
      userId: recipient.id,
    });

    const listed = await client.squadBuilder.listIncomingAccountInvites();

    expect(listed.invites).toHaveLength(1);
    expect(listed.invites[0]).toMatchObject({
      accountId: account.id,
      ownerUserName: "Effect Incoming Owner",
      status: "pending",
    });
  });

  it("lists account access grants through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-grants-owner",
      name: "Effect Grants Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-grants-recipient",
      name: "Effect Grants Recipient",
    });
    const client = createSquadBuilderClient(owner, {
      effectListAccountSharingStateService: new EffectListAccountSharingState(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect grants account",
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
      userId: recipient.id,
    });

    const listed = await client.squadBuilder.listAccountAccessGrants({
      accountId: account.id,
    });

    expect(listed.grants).toHaveLength(1);
    expect(listed.grants[0]).toMatchObject({
      status: "accepted",
      userId: recipient.id,
      userName: "Effect Grants Recipient",
    });
  });

  it("lists incoming squad group invites through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-squad-invites-owner",
      name: "Effect Squad Invite Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-squad-invites-recipient",
    });
    const client = createSquadBuilderClient(recipient, {
      effectListSquadGroupSharingStateService:
        new EffectListSquadGroupSharingState(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const [group] = await testDb
      .insert(squadGroup)
      .values({ name: "Effect incoming squad", ownerUserId: owner.id })
      .returning({ id: squadGroup.id });

    if (group === undefined) {
      throw new Error("Failed to seed squad group");
    }

    await testDb.insert(squadGroupInvitation).values({
      invitedByUserId: owner.id,
      invitedUserId: recipient.id,
      squadGroupId: group.id,
      status: "pending",
    });

    const listed = await client.squadBuilder.listIncomingSquadGroupInvites();

    expect(listed.invites).toHaveLength(1);
    expect(listed.invites[0]).toMatchObject({
      ownerUserName: "Effect Squad Invite Owner",
      squadGroupId: group.id,
      status: "pending",
    });
  });

  it("lists shared squad groups through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-shared-squad-owner",
      name: "Effect Shared Squad Owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-shared-squad-recipient",
    });
    const client = createSquadBuilderClient(recipient, {
      effectListSquadGroupSharingStateService:
        new EffectListSquadGroupSharingState(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const [group] = await testDb
      .insert(squadGroup)
      .values({ name: "Effect shared squad", ownerUserId: owner.id })
      .returning({ id: squadGroup.id });

    if (group === undefined) {
      throw new Error("Failed to seed squad group");
    }

    await testDb.insert(squadGroupInvitation).values({
      invitedByUserId: owner.id,
      invitedUserId: recipient.id,
      squadGroupId: group.id,
      status: "accepted",
    });

    const listed = await client.squadBuilder.listSharedSquadGroups({});

    expect(listed.groups).toHaveLength(1);
    expect(listed.groups[0]).toMatchObject({
      groupId: group.id,
      ownerUserName: "Effect Shared Squad Owner",
      squadCount: 0,
    });
  });

  it("lists squad group editor grants through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-squad-grants-owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-squad-grants-recipient",
      name: "Effect Squad Grant Recipient",
    });
    const client = createSquadBuilderClient(owner, {
      effectListSquadGroupSharingStateService:
        new EffectListSquadGroupSharingState(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const [group] = await testDb
      .insert(squadGroup)
      .values({ name: "Effect grant squad", ownerUserId: owner.id })
      .returning({ id: squadGroup.id });

    if (group === undefined) {
      throw new Error("Failed to seed squad group");
    }

    await testDb.insert(squadGroupInvitation).values({
      invitedByUserId: owner.id,
      invitedUserId: recipient.id,
      squadGroupId: group.id,
      status: "accepted",
    });

    const listed = await client.squadBuilder.listSquadGroupEditorGrants({
      groupId: group.id,
    });

    expect(listed.grants).toHaveLength(1);
    expect(listed.grants[0]).toMatchObject({
      status: "accepted",
      userId: recipient.id,
      userName: "Effect Squad Grant Recipient",
    });
  });

  it("counts pending squad group invites through the Effect bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-squad-count-owner",
    });
    const recipient = await createVerifiedMember({
      id: "router-effect-squad-count-recipient",
    });
    const client = createSquadBuilderClient(recipient, {
      effectListSquadGroupSharingStateService:
        new EffectListSquadGroupSharingState(),
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
    });
    const [firstGroup, secondGroup] = await testDb
      .insert(squadGroup)
      .values([
        { name: "Effect count squad one", ownerUserId: owner.id },
        { name: "Effect count squad two", ownerUserId: owner.id },
      ])
      .returning({ id: squadGroup.id });

    if (firstGroup === undefined || secondGroup === undefined) {
      throw new Error("Failed to seed squad groups");
    }

    await testDb.insert(squadGroupInvitation).values([
      {
        invitedByUserId: owner.id,
        invitedUserId: recipient.id,
        squadGroupId: firstGroup.id,
        status: "pending",
      },
      {
        invitedByUserId: owner.id,
        invitedUserId: recipient.id,
        squadGroupId: secondGroup.id,
        status: "pending",
      },
    ]);

    const counted = await client.squadBuilder.getPendingSquadGroupInviteCount();

    expect(counted).toEqual({ count: 2 });
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

  it("searches verified invite targets through the Effect oRPC bridge", async () => {
    const owner = await createVerifiedMember({
      id: "router-effect-search-owner",
      name: "Effect Search Owner",
    });
    const target = await createVerifiedMember({
      id: "router-effect-search-target",
      name: "Effect Search Target",
    });
    const client = createSquadBuilderClient(owner, {
      effectRuntime: makeApiManagedRuntime(defaultTestDatabaseUrl),
      effectSearchAccountInviteTargetsService:
        new EffectSearchAccountInviteTargets(),
    });

    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Effect search account",
        ownerUserId: owner.id,
        profileId: 7_299_005,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed account");
    }

    const result = await client.squadBuilder.searchAccountInviteTargets({
      accountId: account.id,
      query: "Effect Search",
    });

    const foundIds = result.users.map((user) => user.userId);
    expect(foundIds).toContain(target.id);
    expect(foundIds).not.toContain(owner.id);
  });
});
