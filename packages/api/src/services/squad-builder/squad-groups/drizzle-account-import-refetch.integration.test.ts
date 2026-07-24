import {
  margonemAccount,
  margonemAccountImportPreview,
  margonemAccountImportPreviewCharacter,
  margonemAccountRefetchPreview,
  margonemAccountRefetchPreviewCharacter,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { computeMargonemAccountRefetchDiff } from "../../../domain/squad-builder/margonem-account-refetch-diff.ts";
import {
  parseMargonemCharacterId,
  parsePositiveLevel,
} from "../../../domain/squad-builder/margonem-profile-id.ts";
import { parsePendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import { parsePendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
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
import { confirm as confirmOwnedAccountImport } from "../account-import/confirm-owned-account-import-service.ts";
import { list as listOwnedMargonemAccounts } from "../account-import/list-owned-margonem-accounts.ts";
import { AccountRefetchStoreService } from "../account-refetch/account-refetch-store-service.ts";
import { apply as applyAccountRefetch } from "../account-refetch/apply-account-refetch-service.ts";

const parseTestCharacterId = (value: number) =>
  Effect.runSync(parseMargonemCharacterId(value));

const parseTestLevel = (value: number) =>
  Effect.runSync(parsePositiveLevel(value));

describe("Drizzle account import and refetch integration", () => {
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
      squadBuilderIntegrationTestLayer,
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
    const displayName = Effect.runSyncExit(
      parseAccountDisplayName("Effect pending")
    );

    if (Exit.isFailure(displayName)) {
      throw new Error("Expected display name to be valid");
    }

    const pending = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
              characterId: parseTestCharacterId(1_296_628),
              level: parseTestLevel(301),
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
      squadBuilderIntegrationTestLayer,
      AccountRefetchStoreService.use((store) =>
        store.getAccountForRefetch({
          accountId: parseTestAccountId(account.id),
          actorUserId: parseTestUserId(member.id),
        })
      )
    );

    const fetchedAt = new Date("2026-06-29T12:00:00.000Z");
    const latestCharacters = [
      {
        avatarUrl: null,
        characterId: parseTestCharacterId(1_296_630),
        level: parseTestLevel(301),
        name: "newrefetch",
        profession: "tracker" as const,
        world: "jaruna" as const,
      },
    ];
    const pending = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
      squadBuilderIntegrationTestLayer,
      service.apply({
        actorUserId: parseTestUserId(member.id),
        refetchPreviewId: Effect.runSync(
          parsePendingMargonemAccountRefetchId(pending.id)
        ),
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
      squadBuilderIntegrationTestLayer,
      service.confirm({
        actorUserId: parseTestUserId(member.id),
        displayName: "  Confirmed Effect  ",
        pendingImportId: Effect.runSync(
          parsePendingMargonemAccountImportId(pending.id)
        ),
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
});
