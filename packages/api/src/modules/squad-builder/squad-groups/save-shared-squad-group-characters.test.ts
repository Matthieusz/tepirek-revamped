import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { parseSquadGroupId } from "../squad-group-id";
import { parseSquadId } from "../squad-id";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support";
import { SaveSharedSquadGroupCharacters } from "./save-shared-squad-group-characters";
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

const parseTestSquadId = (value: number) => {
  const squadId = parseSquadId(value);

  if (!isOk(squadId)) {
    throw new Error("Expected test squad id to be valid");
  }

  return squadId.value;
};

const fixedClock = { now: () => new Date("2026-07-02T10:00:00.000Z") };

it.effect("rejects viewers before saving shared squad characters", () => {
  const actorUserId = parseTestUserId("save-shared-viewer");
  const ownerUserId = parseTestUserId("save-shared-owner");
  const groupId = parseTestGroupId(421);
  const detail: SquadGroupDetail = {
    accessRole: "viewer",
    groupId,
    name: "Shared viewer group",
    ownerUserId,
    squads: [],
    updatedAt: fixedClock.now(),
    visibility: "global",
  };
  const store = makeEffectSquadGroupStoreTestService({
    getSquadGroupDetail: () => Effect.succeed(detail),
  });
  const service = new SaveSharedSquadGroupCharacters(
    undefined,
    undefined,
    fixedClock
  );

  return Effect.gen(function* saveSharedViewerEffect() {
    const error = yield* service
      .saveEffect({ actorUserId, groupId, squads: [] })
      .pipe(Effect.flip);

    expect(error._tag).toBe("ActorCannotEditSquadGroup");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect(
  "validates and saves shared squad characters through the Effect store",
  () => {
    const actorUserId = parseTestUserId("save-shared-editor");
    const ownerUserId = parseTestUserId("save-shared-editor-owner");
    const groupId = parseTestGroupId(422);
    const squadId = parseTestSquadId(522);
    const detail: SquadGroupDetail = {
      accessRole: "editor",
      groupId,
      name: "Shared editable group",
      ownerUserId,
      squads: [
        { characters: [], name: "Editable squad", position: 0, squadId },
      ],
      updatedAt: fixedClock.now(),
      visibility: "private",
    };
    const store = makeEffectSquadGroupStoreTestService({
      getSquadGroupDetail: (input) =>
        input.actorUserId === actorUserId && input.groupId === groupId
          ? Effect.succeed(detail)
          : Effect.die(new Error("Unexpected getSquadGroupDetail input")),
      listAvailableCharactersForOwner: (input) =>
        input.ownerUserId === ownerUserId
          ? Effect.succeed([])
          : Effect.die(
              new Error("Unexpected listAvailableCharactersForOwner input")
            ),
      saveSharedSquadGroupCharacters: (input) =>
        input.actorUserId === actorUserId &&
        input.groupId === groupId &&
        input.snapshot.squads[0]?.squadId === squadId &&
        input.now.toISOString() === "2026-07-02T10:00:00.000Z"
          ? Effect.succeed(detail)
          : Effect.die(
              new Error("Unexpected saveSharedSquadGroupCharacters input")
            ),
    });
    const service = new SaveSharedSquadGroupCharacters(
      undefined,
      undefined,
      fixedClock
    );

    return Effect.gen(function* saveSharedEffect() {
      const result = yield* service.saveEffect({
        actorUserId,
        groupId,
        squads: [{ characters: [], squadId }],
      });

      expect(result).toBe(detail);
    }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
  }
);
