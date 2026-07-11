import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.js";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.js";
import {
  layer as squadGroupEditorInviteResponsesLayer,
  SquadGroupEditorInviteResponsesService,
} from "./respond-to-squad-group-invite-service.js";
import { ActorIsNotSquadGroupInviteRecipient } from "./squad-group-errors.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import { makeSquadGroupStoreServiceTestService } from "./squad-group-store.test-support.js";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestGroupId = () => Effect.runSync(parseSquadGroupId(123));

const parseTestInvitationId = () =>
  Effect.runSync(parseSquadGroupInvitationId(456));

const parseTestGroupName = () =>
  Effect.runSync(parseSquadGroupName("Effect respond group"));

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
    const svc = yield* SquadGroupEditorInviteResponsesService;
    const invite = yield* svc.respond({
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
    const svc = yield* SquadGroupEditorInviteResponsesService;
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      svc.respond({
        actorUserId,
        invitationId,
        response: "decline",
      })
    );

    expect(error._tag).toBe("ActorIsNotSquadGroupInviteRecipient");
  }).pipe(Effect.provide(testLayer));
});
