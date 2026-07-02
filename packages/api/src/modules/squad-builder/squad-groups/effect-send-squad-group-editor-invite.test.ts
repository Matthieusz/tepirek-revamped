import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { parseSquadGroupId } from "../squad-group-id";
import { parseSquadGroupInvitationId } from "../squad-group-invitation-id";
import { EffectSendSquadGroupEditorInvite } from "./effect-send-squad-group-editor-invite";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support";
import { EffectSquadGroupStore } from "./squad-group-store";

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
    throw new Error("Expected test squad group id to be valid");
  }

  return groupId.value;
};

const parseTestInvitationId = () => {
  const invitationId = parseSquadGroupInvitationId(456);

  if (!isOk(invitationId)) {
    throw new Error("Expected test squad group invitation id to be valid");
  }

  return invitationId.value;
};

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("sends a squad group editor invite for a verified target", () => {
  const actorUserId = parseTestUserId("effect-squad-send-owner");
  const targetUserId = parseTestUserId("effect-squad-send-target");
  const groupId = parseTestGroupId();
  const invitationId = parseTestInvitationId();
  const store = makeEffectSquadGroupStoreTestService({
    authorizeSquadGroupOwner: (input) => {
      expect(input.actorUserId).toBe(actorUserId);
      expect(input.groupId).toBe(groupId);

      return Effect.succeed({
        _tag: "SquadGroupOwnerAccess" as const,
        groupId,
        ownerUserId: actorUserId,
        role: "owner" as const,
      });
    },
    findVerifiedSquadEditorInviteTarget: (input) => {
      expect(input.targetUserId).toBe(targetUserId);

      return Effect.succeed({
        image: null,
        name: "Send Target",
        userId: targetUserId,
      });
    },
    upsertSquadGroupEditorInvite: (input) => {
      expect(input).toMatchObject({
        groupId,
        invitedUserId: targetUserId,
        now: fixedClock.now(),
        ownerUserId: actorUserId,
      });

      return Effect.succeed({
        createdAt: fixedClock.now(),
        invitationId,
        ownerUserId: actorUserId,
        ownerUserImage: null,
        ownerUserName: "owner",
        squadGroupId: groupId,
        squadGroupName: "Effect squad" as never,
        status: "pending" as const,
        updatedAt: fixedClock.now(),
      });
    },
  });
  const service = new EffectSendSquadGroupEditorInvite(fixedClock);

  return Effect.gen(function* sendSquadGroupEditorInviteEffect() {
    const invite = yield* service.send({
      actorUserId,
      groupId,
      invitedUserId: targetUserId,
    });

    expect(invite).toMatchObject({
      invitationId,
      status: "pending",
    });
    expect(invite.squadGroupId).toBe(groupId);
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("rejects self-invites before resolving the target", () => {
  const actorUserId = parseTestUserId("effect-squad-self-owner");
  const groupId = parseTestGroupId();
  const store = makeEffectSquadGroupStoreTestService({
    authorizeSquadGroupOwner: () =>
      Effect.succeed({
        _tag: "SquadGroupOwnerAccess" as const,
        groupId,
        ownerUserId: actorUserId,
        role: "owner" as const,
      }),
  });
  const service = new EffectSendSquadGroupEditorInvite(fixedClock);

  return Effect.gen(function* sendSquadGroupEditorInviteEffect() {
    const error = yield* Effect.flip(
      service.send({
        actorUserId,
        groupId,
        invitedUserId: actorUserId,
      })
    );

    expect(error._tag).toBe("CannotInviteSelf");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
