import {
  margonemAccount,
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
import { ListOwnedMargonemAccounts } from "../account-import/list-owned-margonem-accounts";
import { systemClock } from "../account-import/preview-margonem-profile-import";
import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { CreateSquadGroup } from "./create-squad-group";
import { ListAvailableSquadCharacters } from "./list-available-squad-characters";
import { ListGlobalSquadGroups } from "./list-global-squad-groups";
import { ListSquadGroups } from "./list-squad-groups";
import { SetSquadGroupVisibility } from "./set-squad-group-visibility";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
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
