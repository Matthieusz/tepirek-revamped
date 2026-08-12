import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.ts";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.ts";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.ts";
import {
  makeSquadGroupDirectoryStoreServiceTestService,
  makeSquadGroupSharingStoreServiceTestService,
} from "../../../test/squad-builder/squad-group-store.ts";
import { send } from "./send-squad-group-editor-invite-service.ts";
import { SquadGroupDirectoryStoreService } from "./squad-group-directory-store.ts";
import { SquadGroupSharingStoreService } from "./squad-group-sharing-store.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestGroupId = () => Effect.runSync(parseSquadGroupId(123));

const parseTestInvitationId = () =>
  Effect.runSync(parseSquadGroupInvitationId(456));

const parseTestGroupName = () =>
  Effect.runSync(parseSquadGroupName("Effect squad"));

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("sends a squad group editor invite for a verified target", () => {
  const actorUserId = parseTestUserId("effect-squad-send-owner");
  const targetUserId = parseTestUserId("effect-squad-send-target");
  const groupId = parseTestGroupId();
  const invitationId = parseTestInvitationId();
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
    upsertSquadGroupEditorInvite: (input) => {
      expect(input).toMatchObject({
        groupId,
        invitedUserId: targetUserId,
        now: fixedClock.now(),
        ownerUserId: actorUserId,
      });

      return Effect.succeed({
        createdAt: fixedClock.now(),
        invitationId,
        ownerUserId: actorUserId,
        ownerUserImage: null,
        ownerUserName: "owner",
        squadGroupId: groupId,
        squadGroupName: parseTestGroupName(),
        status: "pending" as const,
        updatedAt: fixedClock.now(),
      });
    },
  });
  const directoryStore = makeSquadGroupDirectoryStoreServiceTestService({
    findVerifiedSquadEditorInviteTarget: (input) => {
      expect(input.targetUserId).toBe(targetUserId);

      return Effect.succeed({
        image: null,
        name: "Send Target",
        userId: targetUserId,
      });
    },
  });
  const testLayer = Layer.merge(
    Layer.succeed(SquadGroupSharingStoreService, sharingStore),
    Layer.succeed(SquadGroupDirectoryStoreService, directoryStore)
  );

  return Effect.gen(function* sendSquadGroupEditorInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* send({
      actorUserId,
      groupId,
      invitedUserId: targetUserId,
    });

    expect(invite).toMatchObject({
      invitationId,
      status: "pending",
    });
    expect(invite.squadGroupId).toBe(groupId);
  }).pipe(Effect.provide(testLayer));
});

it.effect("rejects self-invites before resolving the target", () => {
  const actorUserId = parseTestUserId("effect-squad-self-owner");
  const groupId = parseTestGroupId();
  const sharingStore = makeSquadGroupSharingStoreServiceTestService({
    authorizeSquadGroupOwner: () =>
      Effect.succeed({
        _tag: "SquadGroupOwnerAccess" as const,
        groupId,
        ownerUserId: actorUserId,
        role: "owner" as const,
      }),
  });
  const testLayer = Layer.merge(
    Layer.succeed(SquadGroupSharingStoreService, sharingStore),
    Layer.succeed(
      SquadGroupDirectoryStoreService,
      makeSquadGroupDirectoryStoreServiceTestService({})
    )
  );

  return Effect.gen(function* sendSquadGroupEditorInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      send({
        actorUserId,
        groupId,
        invitedUserId: actorUserId,
      })
    );

    expect(error._tag).toBe("CannotInviteSelf");
  }).pipe(Effect.provide(testLayer));
});
