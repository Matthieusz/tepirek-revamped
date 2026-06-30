import { squadGroup } from "@tepirek-revamped/db/schema/squad-builder";
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
});
