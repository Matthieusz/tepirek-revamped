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
  layer as squadGroupEditorRevocationsLayer,
  use as squadGroupEditorRevocations,
} from "./revoke-squad-group-editor-service.js";
import { ActorDoesNotOwnSquadGroup } from "./squad-group-errors.js";
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
  const store = makeSquadGroupStoreServiceTestService({
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
  const testLayer = squadGroupEditorRevocationsLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* revokeSquadGroupEditorEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* squadGroupEditorRevocations.revoke({
      actorUserId,
      invitationId,
    });

    expect(invite).toMatchObject({
      invitationId,
      squadGroupId,
      status: "revoked",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("surfaces squad group ownership failures", () => {
  const actorUserId = parseTestUserId("effect-squad-revoke-attacker");
  const invitationId = parseTestInvitationId();
  const store = makeSquadGroupStoreServiceTestService({
    revokeSquadGroupEditor: () => new ActorDoesNotOwnSquadGroup(),
  });
  const testLayer = squadGroupEditorRevocationsLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* revokeSquadGroupEditorEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      squadGroupEditorRevocations.revoke({
        actorUserId,
        invitationId,
      })
    );

    expect(error._tag).toBe("ActorDoesNotOwnSquadGroup");
  }).pipe(Effect.provide(testLayer));
});
