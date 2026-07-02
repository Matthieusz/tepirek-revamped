import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id.js";
import { isOk } from "../result.js";
import { parseSquadGroupId } from "../squad-group-id.js";
import { EffectSearchSquadEditorInviteTargets } from "./effect-search-squad-editor-invite-targets.js";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";

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

it.effect("searches squad editor invite targets for a group owner", () => {
  const actorUserId = parseTestUserId("effect-squad-search-owner");
  const targetUserId = parseTestUserId("effect-squad-search-target");
  const groupId = parseTestGroupId();
  const store = makeEffectSquadGroupStoreTestService({
    authorizeSquadGroupOwner: (input) => {
      expect(input.actorUserId).toBe(actorUserId);
      expect(input.groupId).toBe(groupId);

      return Effect.succeed({
        _tag: "SquadGroupOwnerAccess" as const,
        groupId,
        ownerUserId: actorUserId,
        role: "owner" as const,
      });
    },
    searchSquadEditorInviteTargets: (input) => {
      expect(input.groupId).toBe(groupId);
      expect(input.maxResults).toBe(10);
      expect(input.ownerUserId).toBe(actorUserId);
      expect(input.query).toBe("Target");

      return Effect.succeed([
        {
          image: null,
          name: "Search Target",
          userId: targetUserId,
        },
      ]);
    },
  });
  const service = new EffectSearchSquadEditorInviteTargets();

  return Effect.gen(function* searchSquadEditorInviteTargetsEffect() {
    const targets = yield* service.search({
      actorUserId,
      groupId,
      query: "  Target  ",
    });

    expect(targets).toEqual([
      {
        image: null,
        name: "Search Target",
        userId: targetUserId,
      },
    ]);
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
