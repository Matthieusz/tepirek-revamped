import {
  margonemAccount,
  margonemCharacter,
  squad,
  squadCharacter,
  squadGroup,
  squadGroupInvitation,
} from "@tepirek-revamped/db/schema/squad-builder";
import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";

import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { CharacterPosition } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { parseSquadId } from "../../../domain/squad-builder/squad-id.ts";
import { liveEffect } from "../../../test/effect.ts";
import { createVerifiedMember } from "../../../test/integration/builders.ts";
import { testDb } from "../../../test/integration/database.ts";
import {
  parseTestUserId,
  squadBuilderIntegrationTestLayer,
} from "../../../test/squad-builder/store-integration.ts";
import { create as createSquadGroup } from "./create-squad-group.ts";
import { list as listAvailableSquadCharacters } from "./list-available-squad-characters.ts";
import { list as listGlobalSquadGroups } from "./list-global-squad-groups.ts";
import { getMine, listMine } from "./list-squad-groups.ts";
import { SquadGroupEditorInviteResponsesService } from "./respond-to-squad-group-invite-service.ts";
import { SquadGroupEditorRevocationsService } from "./revoke-squad-group-editor-service.ts";
import { save as saveSquadGroup } from "./save-squad-group.ts";
import { SquadGroupEditorInvitesService } from "./send-squad-group-editor-invite-service.ts";
import { set as setSquadGroupVisibility } from "./set-squad-group-visibility.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

const parseTestSquadGroupId = (value: number) =>
  Effect.runSync(parseSquadGroupId(value));

const parseTestSquadId = (value: number) => Effect.runSync(parseSquadId(value));

const parseTestCharacterPosition = (value: number) =>
  Effect.runSync(Schema.decodeUnknownEffect(CharacterPosition)(value));

describe("Drizzle squad groups integration", () => {
  it("creates a private squad group for the actor", async () => {
    const member = await createVerifiedMember({ id: "effect-create-owner" });
    const service = { create: createSquadGroup };

    const created = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
      squadBuilderIntegrationTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "First listed group",
      })
    );
    await liveEffect(
      squadBuilderIntegrationTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "Second listed group",
      })
    );
    await liveEffect(
      squadBuilderIntegrationTestLayer,
      service.create({
        actorUserId: parseTestUserId(other.id),
        name: "Other listed group",
      })
    );

    const groups = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
      squadBuilderIntegrationTestLayer,
      service.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect detail group",
      })
    );

    const detail = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect save original",
      })
    );

    const saved = await liveEffect(
      squadBuilderIntegrationTestLayer,
      saveService.save({
        actorUserId: parseTestUserId(member.id),
        expectedUpdatedAt: created.updatedAt,
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

  it("rejects an owner save made from a stale detail version", async () => {
    const member = await createVerifiedMember({ id: "effect-stale-owner" });
    const createService = { create: createSquadGroup };
    const saveService = { save: saveSquadGroup };

    const created = await liveEffect(
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Stale owner group",
      })
    );

    const firstSave = await liveEffect(
      squadBuilderIntegrationTestLayer,
      saveService.save({
        actorUserId: parseTestUserId(member.id),
        expectedUpdatedAt: created.updatedAt,
        groupId: created.groupId,
        name: "First owner save",
        squads: [],
      })
    );

    const staleFailure = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.flip(
        saveService.save({
          actorUserId: parseTestUserId(member.id),
          expectedUpdatedAt: created.updatedAt,
          groupId: created.groupId,
          name: "Stale owner save",
          squads: [],
        })
      )
    );

    expect(staleFailure._tag).toBe("SquadGroupWriteConflict");
    expect(firstSave.name).toBe("First owner save");
  });

  it("rolls back a shared save when a submitted character is inaccessible", async () => {
    const member = await createVerifiedMember({ id: "effect-rollback-owner" });
    const [account] = await testDb
      .insert(margonemAccount)
      .values({
        displayName: "Rollback account",
        ownerUserId: member.id,
        profileId: 8_100_250,
      })
      .returning({ id: margonemAccount.id });

    if (account === undefined) {
      throw new Error("Failed to seed rollback account");
    }

    const [character] = await testDb
      .insert(margonemCharacter)
      .values({
        accountId: account.id,
        avatarUrl: null,
        characterId: 1_296_700,
        level: 300,
        name: "rollbackchar",
        profession: "tracker",
        world: "jaruna",
      })
      .returning({ id: margonemCharacter.id });

    if (character === undefined) {
      throw new Error("Failed to seed rollback character");
    }

    const [group] = await testDb
      .insert(squadGroup)
      .values({
        name: "Rollback group",
        ownerUserId: member.id,
        visibility: "private",
      })
      .returning({ id: squadGroup.id });

    if (group === undefined) {
      throw new Error("Failed to seed rollback group");
    }

    const [seededSquad] = await testDb
      .insert(squad)
      .values({
        name: "Rollback squad",
        position: 0,
        squadGroupId: group.id,
      })
      .returning({ id: squad.id });

    if (seededSquad === undefined) {
      throw new Error("Failed to seed rollback squad");
    }

    const [placement] = await testDb
      .insert(squadCharacter)
      .values({
        accountId: account.id,
        characterId: character.id,
        position: 0,
        squadGroupId: group.id,
        squadId: seededSquad.id,
      })
      .returning({ id: squadCharacter.id });

    if (placement === undefined) {
      throw new Error("Failed to seed rollback placement");
    }

    const groupId = parseTestSquadGroupId(group.id);
    const squadId = parseTestSquadId(seededSquad.id);
    const [beforeGroup] = await testDb
      .select({ updatedAt: squadGroup.updatedAt })
      .from(squadGroup)
      .where(eq(squadGroup.id, group.id))
      .limit(1);
    const beforePlacement = await testDb
      .select()
      .from(squadCharacter)
      .where(eq(squadCharacter.id, placement.id))
      .limit(1);

    if (beforeGroup === undefined) {
      throw new Error("Failed to load rollback group");
    }

    const failure = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.flip(
        SquadGroupStoreService.use((store) =>
          store.saveSharedSquadGroupCharacters({
            actorUserId: parseTestUserId(member.id),
            expectedUpdatedAt: beforeGroup.updatedAt,
            groupId,
            now: new Date(beforeGroup.updatedAt.getTime() + 1000),
            snapshot: {
              groupId,
              squads: [
                {
                  characters: [
                    {
                      characterId: 2_000_000_000,
                      position: parseTestCharacterPosition(0),
                    },
                  ],
                  squadId,
                },
              ],
            },
          })
        )
      )
    );

    expect(failure._tag).toBe("SquadCharacterNotAccessible");

    const afterPlacement = await testDb
      .select()
      .from(squadCharacter)
      .where(eq(squadCharacter.id, placement.id))
      .limit(1);
    const [afterGroup] = await testDb
      .select({ updatedAt: squadGroup.updatedAt })
      .from(squadGroup)
      .where(eq(squadGroup.id, group.id))
      .limit(1);

    expect(afterPlacement).toEqual(beforePlacement);
    expect(afterGroup?.updatedAt).toEqual(beforeGroup.updatedAt);
  });

  it("lists available Jaruna characters for the squad group owner", async () => {
    const member = await createVerifiedMember({ id: "effect-available-owner" });
    const service = { create: createSquadGroup };
    const listService = { list: listAvailableSquadCharacters };

    const created = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
      squadBuilderIntegrationTestLayer,
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

  it("changes squad group visibility for the owner", async () => {
    const member = await createVerifiedMember({
      id: "effect-visibility-owner",
    });
    const createService = { create: createSquadGroup };
    const visibilityService = { set: setSquadGroupVisibility };

    const created = await liveEffect(
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect visibility group",
      })
    );

    const changed = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(owner.id),
        name: "Effect store squad send group",
      })
    );

    const invite = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* invite() {
        const svc = yield* SquadGroupEditorInvitesService;
        return yield* svc.send({
          actorUserId: parseTestUserId(owner.id),
          groupId: group.groupId,
          invitedUserId: parseTestUserId(target.id),
        });
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
        squadBuilderIntegrationTestLayer,
        Effect.gen(function* sendDuplicateEditorInviteEffect() {
          const svc = yield* SquadGroupEditorInvitesService;
          return yield* svc.send({
            actorUserId: parseTestUserId(owner.id),
            groupId: group.groupId,
            invitedUserId: parseTestUserId(target.id),
          });
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
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(owner.id),
        name: "Effect store squad respond group",
      })
    );
    const invite = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* invite() {
        const svc = yield* SquadGroupEditorInvitesService;
        return yield* svc.send({
          actorUserId: parseTestUserId(owner.id),
          groupId: group.groupId,
          invitedUserId: parseTestUserId(target.id),
        });
      })
    );
    const accepted = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* accepted() {
        const svc = yield* SquadGroupEditorInviteResponsesService;
        return yield* svc.respond({
          actorUserId: parseTestUserId(target.id),
          invitationId: invite.invitationId,
          response: "accept",
        });
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
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(owner.id),
        name: "Effect store squad revoke group",
      })
    );
    const invite = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* invite() {
        const svc = yield* SquadGroupEditorInvitesService;
        return yield* svc.send({
          actorUserId: parseTestUserId(owner.id),
          groupId: group.groupId,
          invitedUserId: parseTestUserId(target.id),
        });
      })
    );
    const revoked = await liveEffect(
      squadBuilderIntegrationTestLayer,
      Effect.gen(function* revoked() {
        const svc = yield* SquadGroupEditorRevocationsService;
        return yield* svc.revoke({
          actorUserId: parseTestUserId(owner.id),
          invitationId: invite.invitationId,
        });
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

  it("lists globally visible squad groups", async () => {
    const member = await createVerifiedMember({ id: "effect-global-owner" });
    const other = await createVerifiedMember({ id: "effect-global-other" });
    const createService = { create: createSquadGroup };
    const visibilityService = { set: setSquadGroupVisibility };
    const listGlobalService = { list: listGlobalSquadGroups };

    const globalGroup = await liveEffect(
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect global group",
      })
    );
    await liveEffect(
      squadBuilderIntegrationTestLayer,
      visibilityService.set({
        actorUserId: parseTestUserId(member.id),
        groupId: globalGroup.groupId,
        visibility: "global",
      })
    );
    await liveEffect(
      squadBuilderIntegrationTestLayer,
      createService.create({
        actorUserId: parseTestUserId(member.id),
        name: "Effect private group",
      })
    );

    const groups = await liveEffect(
      squadBuilderIntegrationTestLayer,
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
