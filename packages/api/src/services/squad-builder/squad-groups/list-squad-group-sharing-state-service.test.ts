import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.js";
import { parseSquadGroupId } from "../../../domain/squad-builder/squad-group-id.js";
import { parseSquadGroupInvitationId } from "../../../domain/squad-builder/squad-group-invitation-id.js";
import { emptySquadGroupListFilters } from "../../../domain/squad-builder/squad-group-list-filters.js";
import { parseSquadGroupName } from "../../../domain/squad-builder/squad-name.js";
import {
  layer as squadGroupSharingStateLayer,
  use as squadGroupSharingState,
} from "./list-squad-group-sharing-state-service.js";
import { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import { makeSquadGroupStoreServiceTestService } from "./squad-group-store.test-support.js";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestGroupId = () => Effect.runSync(parseSquadGroupId(123));

const parseTestInvitationId = () =>
  Effect.runSync(parseSquadGroupInvitationId(456));

const parseTestGroupName = () =>
  Effect.runSync(parseSquadGroupName("Effect shared group"));

it.effect("lists incoming squad group invites for the actor", () => {
  const actorUserId = parseTestUserId("effect-squad-invite-recipient");
  const ownerUserId = parseTestUserId("effect-squad-invite-owner");
  const invitationId = parseTestInvitationId();
  const squadGroupId = parseTestGroupId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeSquadGroupStoreServiceTestService({
    listIncomingSquadGroupInvites: (input) => {
      expect(input).toMatchObject({ actorUserId });

      return Effect.succeed([
        {
          createdAt,
          invitationId,
          ownerUserId,
          ownerUserImage: null,
          ownerUserName: "Effect Owner",
          squadGroupId,
          squadGroupName: parseTestGroupName(),
          status: "pending",
          updatedAt: createdAt,
        },
      ]);
    },
  });
  const testLayer = squadGroupSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* listIncomingSquadGroupInvitesEffect() {
    const invites = yield* squadGroupSharingState.listIncomingInvites({
      actorUserId,
    });

    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({
      invitationId,
      ownerUserId,
      squadGroupId,
      status: "pending",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("surfaces squad group sharing persistence failures", () => {
  const actorUserId = parseTestUserId("effect-squad-invite-error");
  const store = makeSquadGroupStoreServiceTestService({
    listIncomingSquadGroupInvites: () =>
      Effect.fail(
        new EffectSquadBuilderPersistenceUnavailable({
          cause: new Error("database unavailable"),
          operation: "listIncomingSquadGroupInvites",
          provider: "postgres",
        })
      ),
  });
  const testLayer = squadGroupSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* listIncomingSquadGroupInvitesFailureEffect() {
    const error = yield* Effect.flip(
      squadGroupSharingState.listIncomingInvites({ actorUserId })
    );

    expect(error._tag).toBe("SquadBuilderPersistenceUnavailable");
  }).pipe(Effect.provide(testLayer));
});

it.effect("lists shared squad groups for the actor", () => {
  const actorUserId = parseTestUserId("effect-shared-squad-recipient");
  const ownerUserId = parseTestUserId("effect-shared-squad-owner");
  const groupId = parseTestGroupId();
  const updatedAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeSquadGroupStoreServiceTestService({
    listSharedSquadGroups: (input) => {
      expect(input).toMatchObject({
        actorUserId,
        filters: emptySquadGroupListFilters,
      });

      return Effect.succeed([
        {
          characterCount: 8,
          groupId,
          name: parseTestGroupName(),
          ownerUserId,
          ownerUserImage: null,
          ownerUserName: "Effect Shared Owner",
          squadCount: 2,
          updatedAt,
        },
      ]);
    },
  });
  const testLayer = squadGroupSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* listSharedSquadGroupsEffect() {
    const groups = yield* squadGroupSharingState.listSharedGroups({
      actorUserId,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      characterCount: 8,
      groupId,
      ownerUserId,
      squadCount: 2,
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("lists squad group editor grants", () => {
  const actorUserId = parseTestUserId("effect-editor-grants-owner");
  const userId = parseTestUserId("effect-editor-grants-user");
  const groupId = parseTestGroupId();
  const invitationId = parseTestInvitationId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeSquadGroupStoreServiceTestService({
    listSquadGroupEditorGrants: (input) => {
      expect(input).toMatchObject({ actorUserId, groupId });

      return Effect.succeed([
        {
          createdAt,
          invitationId,
          status: "accepted",
          updatedAt: createdAt,
          userId,
          userImage: null,
          userName: "Effect Editor",
        },
      ]);
    },
  });
  const testLayer = squadGroupSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* listSquadGroupEditorGrantsEffect() {
    const grants = yield* squadGroupSharingState.listEditorGrants({
      actorUserId,
      groupId,
    });

    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      invitationId,
      status: "accepted",
      userId,
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("counts pending squad group invites", () => {
  const actorUserId = parseTestUserId("effect-squad-invite-count");
  const store = makeSquadGroupStoreServiceTestService({
    getPendingSquadGroupInviteCount: (input) => {
      expect(input).toMatchObject({ actorUserId });

      return Effect.succeed(2);
    },
  });
  const testLayer = squadGroupSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(SquadGroupStoreService, store))
  );

  return Effect.gen(function* getPendingSquadGroupInviteCountEffect() {
    const count = yield* squadGroupSharingState.countPendingInvites({
      actorUserId,
    });

    expect(count).toBe(2);
  }).pipe(Effect.provide(testLayer));
});
