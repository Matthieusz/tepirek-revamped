import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id.js";
import { isOk } from "../result.js";
import { parseSquadGroupId } from "../squad-group-id.js";
import { parseSquadGroupInvitationId } from "../squad-group-invitation-id.js";
import { parseSquadGroupName } from "../squad-name.js";
import { EffectRevokeSquadGroupEditor } from "./effect-revoke-squad-group-editor.js";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestGroupId = () => {
  const groupId = parseSquadGroupId(123);

  if (!isOk(groupId)) {
    throw new Error("Expected test group id to be valid");
  }

  return groupId.value;
};

const parseTestInvitationId = () => {
  const invitationId = parseSquadGroupInvitationId(456);

  if (!isOk(invitationId)) {
    throw new Error("Expected test invitation id to be valid");
  }

  return invitationId.value;
};

const parseTestGroupName = () => {
  const groupName = parseSquadGroupName("Effect revoke group");

  if (!isOk(groupName)) {
    throw new Error("Expected test group name to be valid");
  }

  return groupName.value;
};

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("revokes a squad group editor invite as the owner", () => {
  const actorUserId = parseTestUserId("effect-squad-revoke-owner");
  const invitationId = parseTestInvitationId();
  const squadGroupId = parseTestGroupId();
  const squadGroupName = parseTestGroupName();
  const store = makeEffectSquadGroupStoreTestService({
    revokeSquadGroupEditor: (input) => {
      expect(input).toMatchObject({
        invitationId,
        now: fixedClock.now(),
        ownerUserId: actorUserId,
      });

      return Effect.succeed({
        createdAt: fixedClock.now(),
        invitationId,
        ownerUserId: actorUserId,
        ownerUserImage: null,
        ownerUserName: "owner",
        squadGroupId,
        squadGroupName,
        status: "revoked" as const,
        updatedAt: fixedClock.now(),
      });
    },
  });
  const service = new EffectRevokeSquadGroupEditor(fixedClock);

  return Effect.gen(function* revokeSquadGroupEditorEffect() {
    const invite = yield* service.revoke({
      actorUserId,
      invitationId,
    });

    expect(invite).toMatchObject({
      invitationId,
      squadGroupId,
      status: "revoked",
    });
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("surfaces squad group ownership failures", () => {
  const actorUserId = parseTestUserId("effect-squad-revoke-attacker");
  const invitationId = parseTestInvitationId();
  const store = makeEffectSquadGroupStoreTestService({
    revokeSquadGroupEditor: () =>
      Effect.fail({ _tag: "ActorDoesNotOwnSquadGroup" as const }),
  });
  const service = new EffectRevokeSquadGroupEditor(fixedClock);

  return Effect.gen(function* revokeSquadGroupEditorEffect() {
    const error = yield* Effect.flip(
      service.revoke({
        actorUserId,
        invitationId,
      })
    );

    expect(error._tag).toBe("ActorDoesNotOwnSquadGroup");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
