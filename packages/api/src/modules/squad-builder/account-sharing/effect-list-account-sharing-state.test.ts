import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAccountDisplayName } from "../account-display-name";
import { parseAppUserId } from "../app-user-id";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id";
import { parseMargonemAccountId } from "../margonem-account-id";
import { parseMargonemProfileId } from "../margonem-profile-id";
import { isOk } from "../result";
import { makeEffectSquadGroupStoreTestService } from "../squad-groups/effect-squad-group-store.test-support";
import { EffectSquadBuilderPersistenceUnavailable } from "../squad-groups/squad-group-errors";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import { EffectListAccountSharingState } from "./effect-list-account-sharing-state";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isOk(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestAccountId = () => {
  const accountId = parseMargonemAccountId(123);

  if (!isOk(accountId)) {
    throw new Error("Expected test account id to be valid");
  }

  return accountId.value;
};

const parseTestAccessId = () => {
  const accessId = parseMargonemAccountAccessId(456);

  if (!isOk(accessId)) {
    throw new Error("Expected test access id to be valid");
  }

  return accessId.value;
};

const parseTestDisplayName = () => {
  const displayName = parseAccountDisplayName("Effect shared account");

  if (!isOk(displayName)) {
    throw new Error("Expected test display name to be valid");
  }

  return displayName.value;
};

const parseTestProfileId = () => {
  const profileId = parseMargonemProfileId(7_299_020);

  if (!isOk(profileId)) {
    throw new Error("Expected test profile id to be valid");
  }

  return profileId.value;
};

it.effect("lists incoming account access invites for the actor", () => {
  const actorUserId = parseTestUserId("effect-account-invite-recipient");
  const ownerUserId = parseTestUserId("effect-account-invite-owner");
  const accessId = parseTestAccessId();
  const accountId = parseTestAccountId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeEffectSquadGroupStoreTestService({
    listIncomingAccountInvites: (input) => {
      expect(input).toMatchObject({ actorUserId });

      return Effect.succeed([
        {
          accessId,
          accountDisplayName: parseTestDisplayName(),
          accountId,
          createdAt,
          generatedProfileUrl: "https://www.margonem.pl/profile/view,7299020",
          invitedUserId: actorUserId,
          ownerUserId,
          ownerUserImage: null,
          ownerUserName: "Effect Owner",
          status: "pending",
          updatedAt: createdAt,
        },
      ]);
    },
  });
  const service = new EffectListAccountSharingState();

  return Effect.gen(function* listIncomingAccountInvitesEffect() {
    const invites = yield* service.listIncomingInvites({ actorUserId });

    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({
      accessId,
      accountId,
      invitedUserId: actorUserId,
      ownerUserId,
      status: "pending",
    });
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("surfaces persistence failures", () => {
  const actorUserId = parseTestUserId("effect-account-invite-error");
  const store = makeEffectSquadGroupStoreTestService({
    listIncomingAccountInvites: () =>
      Effect.fail(
        new EffectSquadBuilderPersistenceUnavailable({
          cause: new Error("database unavailable"),
          operation: "listIncomingAccountInvites",
          provider: "postgres",
        })
      ),
  });
  const service = new EffectListAccountSharingState();

  return Effect.gen(function* listIncomingAccountInvitesEffect() {
    const error = yield* Effect.flip(
      service.listIncomingInvites({ actorUserId })
    );

    expect(error._tag).toBe("SquadBuilderPersistenceUnavailable");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("lists shared accounts for the actor", () => {
  const actorUserId = parseTestUserId("effect-shared-account-recipient");
  const ownerUserId = parseTestUserId("effect-shared-account-owner");
  const accountId = parseTestAccountId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeEffectSquadGroupStoreTestService({
    listSharedAccounts: (input) => {
      expect(input).toMatchObject({ actorUserId });

      return Effect.succeed([
        {
          accountId,
          characterCount: 3,
          displayName: parseTestDisplayName(),
          generatedProfileUrl: "https://www.margonem.pl/profile/view,7299020",
          lastFetchedAt: createdAt,
          ownerUserId,
          ownerUserImage: null,
          ownerUserName: "Effect Shared Owner",
          profileId: parseTestProfileId(),
        },
      ]);
    },
  });
  const service = new EffectListAccountSharingState();

  return Effect.gen(function* listSharedAccountsEffect() {
    const accounts = yield* service.listSharedAccounts({ actorUserId });

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      accountId,
      characterCount: 3,
      ownerUserId,
      ownerUserName: "Effect Shared Owner",
    });
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("lists account access grants for an owned account", () => {
  const actorUserId = parseTestUserId("effect-grants-owner");
  const invitedUserId = parseTestUserId("effect-grants-invited");
  const accountId = parseTestAccountId();
  const accessId = parseTestAccessId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeEffectSquadGroupStoreTestService({
    findOwnedAccountForSharing: (input) => {
      expect(input).toMatchObject({ accountId, actorUserId });

      return Effect.succeed({
        accountId,
        displayName: parseTestDisplayName(),
        ownerUserId: actorUserId,
        profileId: parseTestProfileId(),
      });
    },
    listAccountAccessGrants: (input) => {
      expect(input).toMatchObject({ accountId, actorUserId });

      return Effect.succeed([
        {
          accessId,
          createdAt,
          invitedUserId,
          invitedUserImage: null,
          invitedUserName: "Effect Invited",
          status: "accepted",
          updatedAt: createdAt,
        },
      ]);
    },
  });
  const service = new EffectListAccountSharingState();

  return Effect.gen(function* listAccountAccessGrantsEffect() {
    const grants = yield* service.listAccountAccessGrants({
      accountId,
      actorUserId,
    });

    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      accessId,
      invitedUserId,
      status: "accepted",
    });
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect(
  "rejects account access grants for accounts owned by another user",
  () => {
    const actorUserId = parseTestUserId("effect-grants-attacker");
    const ownerUserId = parseTestUserId("effect-grants-real-owner");
    const accountId = parseTestAccountId();
    const store = makeEffectSquadGroupStoreTestService({
      findOwnedAccountForSharing: () =>
        Effect.succeed({
          accountId,
          displayName: parseTestDisplayName(),
          ownerUserId,
          profileId: parseTestProfileId(),
        }),
    });
    const service = new EffectListAccountSharingState();

    return Effect.gen(function* listAccountAccessGrantsForbiddenEffect() {
      const error = yield* Effect.flip(
        service.listAccountAccessGrants({ accountId, actorUserId })
      );

      expect(error._tag).toBe("ActorDoesNotOwnMargonemAccount");
    }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
  }
);
