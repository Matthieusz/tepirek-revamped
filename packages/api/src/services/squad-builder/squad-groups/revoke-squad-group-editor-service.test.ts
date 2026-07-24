import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import { makeSquadGroupStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import {
  layer as squadGroupEditorRevocationsLayer,
  SquadGroupEditorRevocationsService,
} from "./revoke-squad-group-editor-service.ts";
import { ActorDoesNotOwnSquadGroup } from "./squad-group-errors.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestGroupId = () => Effect.runSync(parseSquadGroupId(123));

const parseTestInvitationId = () =>
  Effect.runSync(parseSquadGroupInvitationId(456));

const parseTestGroupName = () =>
  Effect.runSync(parseSquadGroupName("Effect revoke group"));

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
    const svc = yield* SquadGroupEditorRevocationsService;
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* svc.revoke({
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
    const svc = yield* SquadGroupEditorRevocationsService;
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      svc.revoke({
        actorUserId,
        invitationId,
      })
    );

    expect(error._tag).toBe("ActorDoesNotOwnSquadGroup");
  }).pipe(Effect.provide(testLayer));
});
