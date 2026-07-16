import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import {
  layer as squadEditorInviteTargetsLayer,
  SquadEditorInviteTargetsService,
} from "./search-squad-editor-invite-targets-service.ts";
import { makeSquadGroupStoreServiceTestService } from "./squad-group-store.test-support.ts";
import { SquadGroupStoreService } from "./squad-group-store.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestGroupId = () => Effect.runSync(parseSquadGroupId(123));

it.effect("searches squad editor invite targets for a group owner", () => {
  const actorUserId = parseTestUserId("effect-squad-search-owner");
  const targetUserId = parseTestUserId("effect-squad-search-target");
  const groupId = parseTestGroupId();
  const store = makeSquadGroupStoreServiceTestService({
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
  const testLayer = squadEditorInviteTargetsLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* searchSquadEditorInviteTargetsEffect() {
    const svc = yield* SquadEditorInviteTargetsService;
    const targets = yield* svc.search({
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
  }).pipe(Effect.provide(testLayer));
});
