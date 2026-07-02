import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id.js";
import { isOk } from "../result.js";
import { parseSquadGroupId } from "../squad-group-id.js";
import { parseSquadGroupName } from "../squad-name.js";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support.js";
import { ListSquadGroups } from "./list-squad-groups.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type {
  SquadGroupDetail,
  SquadGroupSummary,
} from "./squad-group-store.js";

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
        groupId: parseTestGroupId(456),
        name: parseTestGroupName("Main squads"),
        squadCount: 2,
        updatedAt,
      },
    ];
    const store = makeEffectSquadGroupStoreTestService({
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
  const groupId = parseTestGroupId(789);
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
  const store = makeEffectSquadGroupStoreTestService({
    getSquadGroupDetail: (input) =>
      input.actorUserId === actorUserId && input.groupId === groupId
        ? Effect.succeed(detail)
        : Effect.die(new Error("Unexpected getSquadGroupDetail input")),
  });
  const service = new ListSquadGroups();

  return Effect.gen(function* getSquadGroupDetailEffect() {
    const result = yield* service.getMine({ actorUserId, groupId });

    expect(result).toBe(detail);
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
