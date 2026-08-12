import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import {
  makeSquadGroupDirectoryStoreServiceTestService,
  makeSquadGroupSharingStoreServiceTestService,
} from "../../../test/squad-builder/squad-group-store.ts";
import { search } from "./search-squad-editor-invite-targets-service.ts";
import { SquadGroupDirectoryStoreService } from "./squad-group-directory-store.ts";
import { SquadGroupSharingStoreService } from "./squad-group-sharing-store.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestGroupId = () => Effect.runSync(parseSquadGroupId(123));

it.effect("searches squad editor invite targets for a group owner", () => {
  const actorUserId = parseTestUserId("effect-squad-search-owner");
  const targetUserId = parseTestUserId("effect-squad-search-target");
  const groupId = parseTestGroupId();
  const sharingStore = makeSquadGroupSharingStoreServiceTestService({
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
  });
  const directoryStore = makeSquadGroupDirectoryStoreServiceTestService({
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
  const testLayer = Layer.merge(
    Layer.succeed(SquadGroupSharingStoreService, sharingStore),
    Layer.succeed(SquadGroupDirectoryStoreService, directoryStore)
  );

  return Effect.gen(function* searchSquadGroupEditorInviteTargetsEffect() {
    const targets = yield* search({
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
