import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../app-user-id.js";
import { isOk } from "../result.js";
import { parseSquadGroupId } from "../squad-group-id.js";
import { parseSquadGroupInvitationId } from "../squad-group-invitation-id.js";
import { emptySquadGroupListFilters } from "../squad-group-list-filters.js";
import { parseSquadGroupName } from "../squad-name.js";
import {
  layer as squadGroupSharingStateLayer,
  use as squadGroupSharingState,
} from "./effect-list-squad-group-sharing-state.js";
import { makeEffectSquadGroupStoreTestService } from "./effect-squad-group-store.test-support.js";
import { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors.js";
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
    throw new Error("Expected test squad group id to be valid");
  }

  return groupId.value;
};

const parseTestInvitationId = () => {
  const invitationId = parseSquadGroupInvitationId(456);

  if (!isOk(invitationId)) {
    throw new Error("Expected test squad group invitation id to be valid");
  }

  return invitationId.value;
};

const parseTestGroupName = () => {
  const name = parseSquadGroupName("Effect shared group");

  if (!isOk(name)) {
    throw new Error("Expected test squad group name to be valid");
  }

  return name.value;
};

it.effect("lists incoming squad group invites for the actor", () => {
  const actorUserId = parseTestUserId("effect-squad-invite-recipient");
  const ownerUserId = parseTestUserId("effect-squad-invite-owner");
  const invitationId = parseTestInvitationId();
  const squadGroupId = parseTestGroupId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeEffectSquadGroupStoreTestService({
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
    Layer.provide(Layer.succeed(EffectSquadGroupStore, store))
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
  const store = makeEffectSquadGroupStoreTestService({
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
    Layer.provide(Layer.succeed(EffectSquadGroupStore, store))
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
  const store = makeEffectSquadGroupStoreTestService({
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
    Layer.provide(Layer.succeed(EffectSquadGroupStore, store))
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
  const store = makeEffectSquadGroupStoreTestService({
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
    Layer.provide(Layer.succeed(EffectSquadGroupStore, store))
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
  const store = makeEffectSquadGroupStoreTestService({
    getPendingSquadGroupInviteCount: (input) => {
      expect(input).toMatchObject({ actorUserId });

      return Effect.succeed(2);
    },
  });
  const testLayer = squadGroupSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(EffectSquadGroupStore, store))
  );

  return Effect.gen(function* getPendingSquadGroupInviteCountEffect() {
    const count = yield* squadGroupSharingState.countPendingInvites({
      actorUserId,
    });

    expect(count).toBe(2);
  }).pipe(Effect.provide(testLayer));
});
