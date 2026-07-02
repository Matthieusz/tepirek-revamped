import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { parseSquadGroupId } from "../squad-group-id";
import { parseSquadGroupInvitationId } from "../squad-group-invitation-id";
import { parseSquadGroupName } from "../squad-name";
import { EffectRespondToSquadGroupInvite } from "./effect-respond-to-squad-group-invite";
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
  const groupName = parseSquadGroupName("Effect respond group");

  if (!isOk(groupName)) {
    throw new Error("Expected test group name to be valid");
  }

  return groupName.value;
};

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("accepts a squad group editor invite as the invited user", () => {
  const actorUserId = parseTestUserId("effect-squad-respond-recipient");
  const ownerUserId = parseTestUserId("effect-squad-respond-owner");
  const invitationId = parseTestInvitationId();
  const squadGroupId = parseTestGroupId();
  const squadGroupName = parseTestGroupName();
  const store = makeEffectSquadGroupStoreTestService({
    respondToSquadGroupInvite: (input) => {
      expect(input).toMatchObject({
        invitationId,
        invitedUserId: actorUserId,
        now: fixedClock.now(),
        response: "accept",
      });

      return Effect.succeed({
        createdAt: fixedClock.now(),
        invitationId,
        ownerUserId,
        ownerUserImage: null,
        ownerUserName: "owner",
        squadGroupId,
        squadGroupName,
        status: "accepted" as const,
        updatedAt: fixedClock.now(),
      });
    },
  });
  const service = new EffectRespondToSquadGroupInvite(fixedClock);

  return Effect.gen(function* respondToSquadGroupInviteEffect() {
    const invite = yield* service.respond({
      actorUserId,
      invitationId,
      response: "accept",
    });

    expect(invite).toMatchObject({
      invitationId,
      squadGroupId,
      status: "accepted",
    });
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("surfaces squad invite recipient authorization failures", () => {
  const actorUserId = parseTestUserId("effect-squad-respond-attacker");
  const invitationId = parseTestInvitationId();
  const store = makeEffectSquadGroupStoreTestService({
    respondToSquadGroupInvite: () =>
      Effect.fail({ _tag: "ActorIsNotSquadGroupInviteRecipient" as const }),
  });
  const service = new EffectRespondToSquadGroupInvite(fixedClock);

  return Effect.gen(function* respondToSquadGroupInviteEffect() {
    const error = yield* Effect.flip(
      service.respond({
        actorUserId,
        invitationId,
        response: "decline",
      })
    );

    expect(error._tag).toBe("ActorIsNotSquadGroupInviteRecipient");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
