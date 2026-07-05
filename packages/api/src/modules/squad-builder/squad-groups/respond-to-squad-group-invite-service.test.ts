import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../app-user-id.js";
import { isOk } from "../result.js";
import { parseSquadGroupId } from "../squad-group-id.js";
import { parseSquadGroupInvitationId } from "../squad-group-invitation-id.js";
import { parseSquadGroupName } from "../squad-name.js";
import {
  layer as squadGroupEditorInviteResponsesLayer,
  use as squadGroupEditorInviteResponses,
} from "./respond-to-squad-group-invite-service.js";
import { ActorIsNotSquadGroupInviteRecipient } from "./squad-group-errors.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import { makeSquadGroupStoreServiceTestService } from "./squad-group-store.test-support.js";

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
  const store = makeSquadGroupStoreServiceTestService({
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
  const testLayer = squadGroupEditorInviteResponsesLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* respondToSquadGroupInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* squadGroupEditorInviteResponses.respond({
      actorUserId,
      invitationId,
      response: "accept",
    });

    expect(invite).toMatchObject({
      invitationId,
      squadGroupId,
      status: "accepted",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("surfaces squad invite recipient authorization failures", () => {
  const actorUserId = parseTestUserId("effect-squad-respond-attacker");
  const invitationId = parseTestInvitationId();
  const store = makeSquadGroupStoreServiceTestService({
    respondToSquadGroupInvite: () => new ActorIsNotSquadGroupInviteRecipient(),
  });
  const testLayer = squadGroupEditorInviteResponsesLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* respondToSquadGroupInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      squadGroupEditorInviteResponses.respond({
        actorUserId,
        invitationId,
        response: "decline",
      })
    );

    expect(error._tag).toBe("ActorIsNotSquadGroupInviteRecipient");
  }).pipe(Effect.provide(testLayer));
});
