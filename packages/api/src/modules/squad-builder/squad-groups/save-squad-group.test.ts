import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { parseSquadGroupId } from "../squad-group-id";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support";
import { SaveSquadGroup } from "./save-squad-group";
import { EffectSquadGroupStore } from "./squad-group-store";
import type { SquadGroupDetail } from "./squad-group-store";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestGroupId = (value: number) => {
  const groupId = parseSquadGroupId(value);

  if (!isOk(groupId)) {
    throw new Error("Expected test squad group id to be valid");
  }

  return groupId.value;
};

const fixedClock = { now: () => new Date("2026-07-02T10:00:00.000Z") };

it.effect("rejects an invalid saved squad group name", () => {
  const actorUserId = parseTestUserId("save-effect-invalid-name");
  const groupId = parseTestGroupId(321);
  const detail: SquadGroupDetail = {
    accessRole: "owner",
    groupId,
    name: "Existing group",
    ownerUserId: actorUserId,
    squads: [],
    updatedAt: fixedClock.now(),
    visibility: "private",
  };
  const store = makeEffectSquadGroupStoreTestService({
    getSquadGroupDetail: () => Effect.succeed(detail),
    listAvailableCharactersForOwner: () => Effect.succeed([]),
  });
  const service = new SaveSquadGroup(fixedClock);

  return Effect.gen(function* invalidNameEffect() {
    const error = yield* service
      .save({
        actorUserId,
        groupId,
        name: "   ",
        squads: [],
      })
      .pipe(Effect.flip);

    expect(error._tag).toBe("InvalidSquadGroupName");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect(
  "validates and saves a squad group snapshot through the Effect store",
  () => {
    const actorUserId = parseTestUserId("save-effect-valid");
    const groupId = parseTestGroupId(322);
    const detail: SquadGroupDetail = {
      accessRole: "owner",
      groupId,
      name: "Saved Effect group",
      ownerUserId: actorUserId,
      squads: [],
      updatedAt: fixedClock.now(),
      visibility: "private",
    };
    const store = makeEffectSquadGroupStoreTestService({
      getSquadGroupDetail: (input) =>
        input.actorUserId === actorUserId && input.groupId === groupId
          ? Effect.succeed(detail)
          : Effect.die(new Error("Unexpected getSquadGroupDetail input")),
      listAvailableCharactersForOwner: (input) =>
        input.ownerUserId === actorUserId
          ? Effect.succeed([])
          : Effect.die(
              new Error("Unexpected listAvailableCharactersForOwner input")
            ),
      saveSquadGroupSnapshot: (input) =>
        input.actorUserId === actorUserId &&
        input.snapshot.groupId === groupId &&
        input.snapshot.name === "Saved Effect group" &&
        input.now.toISOString() === "2026-07-02T10:00:00.000Z"
          ? Effect.succeed(detail)
          : Effect.die(new Error("Unexpected saveSquadGroupSnapshot input")),
    });
    const service = new SaveSquadGroup(fixedClock);

    return Effect.gen(function* saveEffect() {
      const result = yield* service.save({
        actorUserId,
        groupId,
        name: "  Saved Effect group  ",
        squads: [],
      });

      expect(result).toBe(detail);
    }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
  }
);
