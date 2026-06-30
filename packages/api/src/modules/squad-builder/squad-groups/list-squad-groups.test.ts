import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { isOk } from "../result";
import { parseSquadGroupName } from "../squad-name";
import { ListSquadGroups } from "./list-squad-groups";
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
