import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { parseSquadGroupName } from "../squad-name";
import { CreateSquadGroup } from "./create-squad-group";
import { EffectSquadGroupStore } from "./squad-group-store";
import type { SquadGroupSummary } from "./squad-group-store";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestGroupName = (value: string) => {
  const name = parseSquadGroupName(value);

  if (!isOk(name)) {
    throw new Error("Expected test squad group name to be valid");
  }

  return name.value;
};

it.effect("rejects an invalid squad group name", () => {
  const store = EffectSquadGroupStore.of({
    createSquadGroup: () => Effect.die(new Error("Store should not be called")),
    getSquadGroupDetail: () =>
      Effect.die(new Error("Store should not be called")),
    listMySquadGroups: () =>
      Effect.die(new Error("Store should not be called")),
  });

  return Effect.gen(function* invalidNameEffect() {
    const service = new CreateSquadGroup();
    const error = yield* service
      .create({
        actorUserId: parseTestUserId("create-effect-invalid-name"),
        name: "   ",
      })
      .pipe(Effect.flip);

    expect(error._tag).toBe("InvalidSquadGroupName");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("returns the store-created squad group summary", () => {
  const actorUserId = parseTestUserId("create-effect-valid-name");
  const storedName = parseTestGroupName("Main squads");
  const updatedAt = new Date("2026-06-30T12:00:00.000Z");
  const summary: SquadGroupSummary = {
    characterCount: 0,
    groupId: 123 as never,
    name: storedName,
    squadCount: 0,
    updatedAt,
  };
  const store = EffectSquadGroupStore.of({
    createSquadGroup: (input) =>
      input.actorUserId === actorUserId && input.name === storedName
        ? Effect.succeed(summary)
        : Effect.die(new Error("Unexpected createSquadGroup input")),
    getSquadGroupDetail: () =>
      Effect.die(new Error("Store should not be called")),
    listMySquadGroups: () =>
      Effect.die(new Error("Store should not be called")),
  });
  const service = new CreateSquadGroup();

  return Effect.gen(function* validNameEffect() {
    const result = yield* service.create({
      actorUserId,
      name: "  Main squads  ",
    });

    expect(result).toBe(summary);
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
