import { expect, it as effectIt } from "@effect/vitest";
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

import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { CharacterPosition } from "../../../domain/squad-builder/squad-group-snapshot.ts";
import { parseSquadId } from "../../../domain/squad-builder/squad-id.ts";
import { createVerifiedMember } from "../../../test/integration/builders.ts";
import { testDb } from "../../../test/integration/database.ts";
import {
  parseTestUserId,
  squadBuilderIntegrationTestLayer,
} from "../../../test/squad-builder/store-integration.ts";
import { create as createSquadGroup } from "./create-squad-group.ts";
import { list as listAvailableSquadCharacters } from "./list-available-squad-characters.ts";
import { list as listGlobalSquadGroups } from "./list-global-squad-groups.ts";
import { save as saveSquadGroup } from "./save-squad-group.ts";
import { send } from "./send-squad-group-editor-invite-service.ts";
import { set as setSquadGroupVisibility } from "./set-squad-group-visibility.ts";
import { respond, revoke } from "./squad-group-sharing-operations.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

const parseTestSquadGroupId = (value: number) =>
  Effect.runSync(parseSquadGroupId(value));

const parseTestSquadId = (value: number) => Effect.runSync(parseSquadId(value));

const parseTestCharacterPosition = (value: number) =>
  Effect.runSync(Schema.decodeUnknownEffect(CharacterPosition)(value));

effectIt.layer(squadBuilderIntegrationTestLayer, { excludeTestServices: true })(
  "Drizzle squad groups integration",
  (it) => {
    it.effect("creates a private squad group for the actor", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-create-owner" })
        );

        const created = yield* createSquadGroup({
          actorUserId: parseTestUserId(member.id),
          name: "  Effect group  ",
        });

        expect(created).toMatchObject({
          characterCount: 0,
          name: "Effect group",
          squadCount: 0,
        });

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({
              name: squadGroup.name,
              ownerUserId: squadGroup.ownerUserId,
              visibility: squadGroup.visibility,
            })
            .from(squadGroup)
            .where(eq(squadGroup.id, created.groupId))
            .limit(1)
        );

        expect(stored).toEqual({
          name: "Effect group",
          ownerUserId: member.id,
          visibility: "private",
        });
      })
    );

    it.effect("lists only squad groups owned by the actor", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-list-owner" })
        );
        const other = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-list-other" })
        );

        yield* createSquadGroup({
          actorUserId: parseTestUserId(member.id),
          name: "First listed group",
        });
        yield* createSquadGroup({
          actorUserId: parseTestUserId(member.id),
          name: "Second listed group",
        });
        yield* createSquadGroup({
          actorUserId: parseTestUserId(other.id),
          name: "Other listed group",
        });

        const groups = yield* SquadGroupStoreService.use((store) =>
          store.listMySquadGroups({
            actorUserId: parseTestUserId(member.id),
          })
        );

        const groupNames = groups.map((group) => group.name);

        expect(groupNames).toContain("First listed group");
        expect(groupNames).toContain("Second listed group");
        expect(groupNames).not.toContain("Other listed group");
      })
    );

    it.effect("loads a squad group detail for the owner", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-detail-owner" })
        );

        const created = yield* createSquadGroup({
          actorUserId: parseTestUserId(member.id),
          name: "Effect detail group",
        });

        const detail = yield* SquadGroupStoreService.use((store) =>
          store.getSquadGroupDetail({
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
      })
    );

    it.effect("saves a squad group snapshot through the Effect store", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-save-owner" })
        );
        const createService = { create: createSquadGroup };
        const saveService = { save: saveSquadGroup };

        const created = yield* createService.create({
          actorUserId: parseTestUserId(member.id),
          name: "Effect save original",
        });

        const saved = yield* saveService.save({
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
        });

        expect(saved).toMatchObject({
          accessRole: "owner",
          groupId: created.groupId,
          name: "Effect save updated",
          squads: [{ characters: [], name: "First squad", position: 0 }],
        });
      })
    );

    it.effect("rejects an owner save made from a stale detail version", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-stale-owner" })
        );
        const createService = { create: createSquadGroup };
        const saveService = { save: saveSquadGroup };

        const created = yield* createService.create({
          actorUserId: parseTestUserId(member.id),
          name: "Stale owner group",
        });

        const firstSave = yield* saveService.save({
          actorUserId: parseTestUserId(member.id),
          expectedUpdatedAt: created.updatedAt,
          groupId: created.groupId,
          name: "First owner save",
          squads: [],
        });

        const staleFailure = yield* Effect.flip(
          saveService.save({
            actorUserId: parseTestUserId(member.id),
            expectedUpdatedAt: created.updatedAt,
            groupId: created.groupId,
            name: "Stale owner save",
            squads: [],
          })
        );

        expect(staleFailure._tag).toBe("SquadGroupWriteConflict");
        expect(firstSave.name).toBe("First owner save");
      })
    );

    it.effect(
      "rolls back a shared save when a submitted character is inaccessible",
      () =>
        Effect.gen(function* testEffect() {
          const member = yield* Effect.promise(() =>
            createVerifiedMember({ id: "effect-rollback-owner" })
          );
          const [account] = yield* Effect.promise(() =>
            testDb
              .insert(margonemAccount)
              .values({
                displayName: "Rollback account",
                ownerUserId: member.id,
                profileId: 8_100_250,
              })
              .returning({ id: margonemAccount.id })
          );

          if (account === undefined) {
            throw new Error("Failed to seed rollback account");
          }

          const [character] = yield* Effect.promise(() =>
            testDb
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
              .returning({ id: margonemCharacter.id })
          );

          if (character === undefined) {
            throw new Error("Failed to seed rollback character");
          }

          const [group] = yield* Effect.promise(() =>
            testDb
              .insert(squadGroup)
              .values({
                name: "Rollback group",
                ownerUserId: member.id,
                visibility: "private",
              })
              .returning({ id: squadGroup.id })
          );

          if (group === undefined) {
            throw new Error("Failed to seed rollback group");
          }

          const [seededSquad] = yield* Effect.promise(() =>
            testDb
              .insert(squad)
              .values({
                name: "Rollback squad",
                position: 0,
                squadGroupId: group.id,
              })
              .returning({ id: squad.id })
          );

          if (seededSquad === undefined) {
            throw new Error("Failed to seed rollback squad");
          }

          const [placement] = yield* Effect.promise(() =>
            testDb
              .insert(squadCharacter)
              .values({
                accountId: account.id,
                characterId: character.id,
                position: 0,
                squadGroupId: group.id,
                squadId: seededSquad.id,
              })
              .returning({ id: squadCharacter.id })
          );

          if (placement === undefined) {
            throw new Error("Failed to seed rollback placement");
          }

          const groupId = parseTestSquadGroupId(group.id);
          const squadId = parseTestSquadId(seededSquad.id);
          const [beforeGroup] = yield* Effect.promise(() =>
            testDb
              .select({ updatedAt: squadGroup.updatedAt })
              .from(squadGroup)
              .where(eq(squadGroup.id, group.id))
              .limit(1)
          );
          const beforePlacement = yield* Effect.promise(() =>
            testDb
              .select()
              .from(squadCharacter)
              .where(eq(squadCharacter.id, placement.id))
              .limit(1)
          );

          if (beforeGroup === undefined) {
            throw new Error("Failed to load rollback group");
          }

          const failure = yield* Effect.flip(
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
          );

          expect(failure._tag).toBe("SquadCharacterNotAccessible");

          const afterPlacement = yield* Effect.promise(() =>
            testDb
              .select()
              .from(squadCharacter)
              .where(eq(squadCharacter.id, placement.id))
              .limit(1)
          );
          const [afterGroup] = yield* Effect.promise(() =>
            testDb
              .select({ updatedAt: squadGroup.updatedAt })
              .from(squadGroup)
              .where(eq(squadGroup.id, group.id))
              .limit(1)
          );

          expect(afterPlacement).toEqual(beforePlacement);
          expect(afterGroup?.updatedAt).toEqual(beforeGroup.updatedAt);
        })
    );

    it.effect(
      "lists available Jaruna characters for the squad group owner",
      () =>
        Effect.gen(function* testEffect() {
          const member = yield* Effect.promise(() =>
            createVerifiedMember({ id: "effect-available-owner" })
          );
          const listService = { list: listAvailableSquadCharacters };

          const created = yield* createSquadGroup({
            actorUserId: parseTestUserId(member.id),
            name: "Effect available group",
          });
          const [account] = yield* Effect.promise(() =>
            testDb
              .insert(margonemAccount)
              .values({
                displayName: "Available account",
                ownerUserId: member.id,
                profileId: 8_100_001,
              })
              .returning({ id: margonemAccount.id })
          );

          if (account === undefined) {
            throw new Error("Failed to seed account");
          }

          const [character] = yield* Effect.promise(() =>
            testDb
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
              .returning({ id: margonemCharacter.id })
          );

          if (character === undefined) {
            throw new Error("Failed to seed character");
          }

          const characters = yield* listService.list({
            actorUserId: parseTestUserId(member.id),
            groupId: created.groupId,
          });

          expect(characters).toHaveLength(1);
          expect(characters[0]).toMatchObject({
            accountId: account.id,
            accountOwnerUserId: parseTestUserId(member.id),
            characterId: character.id,
            name: "informati",
            profession: "tracker",
            world: "jaruna",
          });
        })
    );

    it.effect("changes squad group visibility for the owner", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-visibility-owner",
          })
        );
        const createService = { create: createSquadGroup };
        const visibilityService = { set: setSquadGroupVisibility };

        const created = yield* createService.create({
          actorUserId: parseTestUserId(member.id),
          name: "Effect visibility group",
        });

        const changed = yield* visibilityService.set({
          actorUserId: parseTestUserId(member.id),
          groupId: created.groupId,
          visibility: "global",
        });

        expect(changed).toMatchObject({
          groupId: created.groupId,
          visibility: "global",
        });

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ visibility: squadGroup.visibility })
            .from(squadGroup)
            .where(eq(squadGroup.id, created.groupId))
            .limit(1)
        );

        expect(stored?.visibility).toBe("global");
      })
    );

    it.effect("sends squad group editor invites", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-squad-send-owner",
            name: "Effect Store Squad Send Owner",
          })
        );
        const target = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-squad-send-target",
            name: "Effect Store Squad Send Target",
          })
        );
        const createService = { create: createSquadGroup };
        const group = yield* createService.create({
          actorUserId: parseTestUserId(owner.id),
          name: "Effect store squad send group",
        });

        const invite = yield* send({
          actorUserId: parseTestUserId(owner.id),
          groupId: group.groupId,
          invitedUserId: parseTestUserId(target.id),
        });

        expect(invite).toMatchObject({
          ownerUserId: parseTestUserId(owner.id),
          ownerUserName: "Effect Store Squad Send Owner",
          squadGroupId: group.groupId,
          status: "pending",
        });

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({
              invitedUserId: squadGroupInvitation.invitedUserId,
              status: squadGroupInvitation.status,
            })
            .from(squadGroupInvitation)
            .where(eq(squadGroupInvitation.id, invite.invitationId))
            .limit(1)
        );

        expect(stored).toEqual({
          invitedUserId: target.id,
          status: "pending",
        });

        const duplicateFailure = yield* Effect.flip(
          send({
            actorUserId: parseTestUserId(owner.id),
            groupId: group.groupId,
            invitedUserId: parseTestUserId(target.id),
          })
        );

        expect(duplicateFailure).toMatchObject({
          _tag: "SquadGroupInvitationTransitionNotAllowed",
        });
      })
    );

    it.effect("responds to squad group editor invites", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-squad-respond-owner",
            name: "Effect Store Squad Respond Owner",
          })
        );
        const target = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-squad-respond-target",
            name: "Effect Store Squad Respond Target",
          })
        );
        const createService = { create: createSquadGroup };
        const group = yield* createService.create({
          actorUserId: parseTestUserId(owner.id),
          name: "Effect store squad respond group",
        });
        const invite = yield* send({
          actorUserId: parseTestUserId(owner.id),
          groupId: group.groupId,
          invitedUserId: parseTestUserId(target.id),
        });
        const accepted = yield* respond({
          actorUserId: parseTestUserId(target.id),
          invitationId: invite.invitationId,
          response: "accept",
        });

        expect(accepted).toMatchObject({
          invitationId: invite.invitationId,
          squadGroupId: group.groupId,
          status: "accepted",
        });

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: squadGroupInvitation.status })
            .from(squadGroupInvitation)
            .where(eq(squadGroupInvitation.id, invite.invitationId))
            .limit(1)
        );

        expect(stored?.status).toBe("accepted");
      })
    );

    it.effect("revokes squad group editor invites", () =>
      Effect.gen(function* testEffect() {
        const owner = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-squad-revoke-owner",
            name: "Effect Store Squad Revoke Owner",
          })
        );
        const target = yield* Effect.promise(() =>
          createVerifiedMember({
            id: "effect-store-squad-revoke-target",
            name: "Effect Store Squad Revoke Target",
          })
        );
        const createService = { create: createSquadGroup };
        const group = yield* createService.create({
          actorUserId: parseTestUserId(owner.id),
          name: "Effect store squad revoke group",
        });
        const invite = yield* send({
          actorUserId: parseTestUserId(owner.id),
          groupId: group.groupId,
          invitedUserId: parseTestUserId(target.id),
        });
        const revoked = yield* revoke({
          actorUserId: parseTestUserId(owner.id),
          invitationId: invite.invitationId,
        });

        expect(revoked).toMatchObject({
          invitationId: invite.invitationId,
          squadGroupId: group.groupId,
          status: "revoked",
        });

        const [stored] = yield* Effect.promise(() =>
          testDb
            .select({ status: squadGroupInvitation.status })
            .from(squadGroupInvitation)
            .where(eq(squadGroupInvitation.id, invite.invitationId))
            .limit(1)
        );

        expect(stored?.status).toBe("revoked");
      })
    );

    it.effect("lists globally visible squad groups", () =>
      Effect.gen(function* testEffect() {
        const member = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-global-owner" })
        );
        const other = yield* Effect.promise(() =>
          createVerifiedMember({ id: "effect-global-other" })
        );
        const createService = { create: createSquadGroup };
        const visibilityService = { set: setSquadGroupVisibility };
        const listGlobalService = { list: listGlobalSquadGroups };

        const globalGroup = yield* createService.create({
          actorUserId: parseTestUserId(member.id),
          name: "Effect global group",
        });
        yield* visibilityService.set({
          actorUserId: parseTestUserId(member.id),
          groupId: globalGroup.groupId,
          visibility: "global",
        });
        yield* createService.create({
          actorUserId: parseTestUserId(member.id),
          name: "Effect private group",
        });

        const groups = yield* listGlobalService.list({
          actorUserId: parseTestUserId(other.id),
        });
        const groupNames = groups.map((group) => group.name);

        expect(groupNames).toContain("Effect global group");
        expect(groupNames).not.toContain("Effect private group");
        expect(
          groups.find((group) => group.groupId === globalGroup.groupId)
        ).toMatchObject({
          ownerUserId: parseTestUserId(member.id),
          ownerUserName: member.name,
        });
      })
    );
  }
);
