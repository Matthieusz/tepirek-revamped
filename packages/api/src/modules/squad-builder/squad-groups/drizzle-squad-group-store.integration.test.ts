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
import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { CreateSquadGroup } from "./create-squad-group";
import { ListAvailableSquadCharacters } from "./list-available-squad-characters";
import { ListSquadGroups } from "./list-squad-groups";

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
});
