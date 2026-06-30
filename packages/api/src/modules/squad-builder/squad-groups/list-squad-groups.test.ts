import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { parseSquadGroupName } from "../squad-name";
import { ListSquadGroups } from "./list-squad-groups";
import { EffectSquadGroupStore } from "./squad-group-store";
import type { SquadGroupDetail, SquadGroupSummary } from "./squad-group-store";

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

it.effect(
  "returns actor-owned squad group summaries from the Effect store",
  () => {
    const actorUserId = parseTestUserId("list-effect-owner");
    const updatedAt = new Date("2026-06-30T13:00:00.000Z");
    const summaries: readonly SquadGroupSummary[] = [
      {
        characterCount: 3,
        groupId: 456 as never,
        name: parseTestGroupName("Main squads"),
        squadCount: 2,
        updatedAt,
      },
    ];
    const store = EffectSquadGroupStore.of({
      createSquadGroup: () =>
        Effect.die(new Error("Store should not be called")),
      getSquadGroupDetail: () =>
        Effect.die(new Error("Store should not be called")),
      listAvailableCharactersForOwner: () =>
        Effect.die(new Error("Store should not be called")),
      listGlobalSquadGroups: () =>
        Effect.die(new Error("Store should not be called")),
      listMySquadGroups: (input) =>
        input.actorUserId === actorUserId
          ? Effect.succeed(summaries)
          : Effect.die(new Error("Unexpected listMySquadGroups input")),
    });
    const service = new ListSquadGroups();

    return Effect.gen(function* listMySquadGroupsEffect() {
      const result = yield* service.listMine({ actorUserId });

      expect(result).toBe(summaries);
    }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
  }
);

it.effect("returns a visible squad group detail from the Effect store", () => {
  const actorUserId = parseTestUserId("detail-effect-owner");
  const groupId = 789 as never;
  const updatedAt = new Date("2026-06-30T14:00:00.000Z");
  const detail: SquadGroupDetail = {
    accessRole: "owner",
    groupId,
    name: "Main squads",
    ownerUserId: actorUserId,
    squads: [],
    updatedAt,
    visibility: "private",
  };
  const store = EffectSquadGroupStore.of({
    createSquadGroup: () => Effect.die(new Error("Store should not be called")),
    getSquadGroupDetail: (input) =>
      input.actorUserId === actorUserId && input.groupId === groupId
        ? Effect.succeed(detail)
        : Effect.die(new Error("Unexpected getSquadGroupDetail input")),
    listAvailableCharactersForOwner: () =>
      Effect.die(new Error("Store should not be called")),
    listGlobalSquadGroups: () =>
      Effect.die(new Error("Store should not be called")),
    listMySquadGroups: () =>
      Effect.die(new Error("Store should not be called")),
  });
  const service = new ListSquadGroups();

  return Effect.gen(function* getSquadGroupDetailEffect() {
    const result = yield* service.getMine({ actorUserId, groupId });

    expect(result).toBe(detail);
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
