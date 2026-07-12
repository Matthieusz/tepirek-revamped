import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { EffectSquadBuilderPersistenceUnavailable } from "../squad-groups/squad-group-errors.ts";
import { makeAccountSharingStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import {
  layer as accountSharingStateLayer,
  AccountSharingStateService,
} from "./list-account-sharing-state-service.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));

const parseTestAccessId = () =>
  Effect.runSync(parseMargonemAccountAccessId(456));

const parseTestDisplayName = () =>
  Effect.runSync(parseAccountDisplayName("Effect shared account"));

const parseTestProfileId = () =>
  Effect.runSync(parseMargonemProfileId(7_299_020));

it.effect("lists incoming account access invites for the actor", () => {
  const actorUserId = parseTestUserId("effect-account-invite-recipient");
  const ownerUserId = parseTestUserId("effect-account-invite-owner");
  const accessId = parseTestAccessId();
  const accountId = parseTestAccountId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeAccountSharingStoreServiceTestService({
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
  const testLayer = accountSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* listIncomingAccountInvitesEffect() {
    const svc = yield* AccountSharingStateService;
    const invites = yield* svc.listIncomingInvites({
      actorUserId,
    });

    expect(invites).toHaveLength(1);
    expect(invites[0]).toMatchObject({
      accessId,
      accountId,
      invitedUserId: actorUserId,
      ownerUserId,
      status: "pending",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("surfaces persistence failures", () => {
  const actorUserId = parseTestUserId("effect-account-invite-error");
  const store = makeAccountSharingStoreServiceTestService({
    listIncomingAccountInvites: () =>
      Effect.fail(
        new EffectSquadBuilderPersistenceUnavailable({
          cause: new Error("database unavailable"),
          operation: "listIncomingAccountInvites",
          provider: "postgres",
        })
      ),
  });
  const testLayer = accountSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* listIncomingAccountInvitesEffect() {
    const svc = yield* AccountSharingStateService;
    const error = yield* Effect.flip(svc.listIncomingInvites({ actorUserId }));

    expect(error._tag).toBe("SquadBuilderPersistenceUnavailable");
  }).pipe(Effect.provide(testLayer));
});

it.effect("lists shared accounts for the actor", () => {
  const actorUserId = parseTestUserId("effect-shared-account-recipient");
  const ownerUserId = parseTestUserId("effect-shared-account-owner");
  const accountId = parseTestAccountId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeAccountSharingStoreServiceTestService({
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
  const testLayer = accountSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* listSharedAccountsEffect() {
    const svc = yield* AccountSharingStateService;
    const accounts = yield* svc.listSharedAccounts({
      actorUserId,
    });

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      accountId,
      characterCount: 3,
      ownerUserId,
      ownerUserName: "Effect Shared Owner",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("lists account access grants for an owned account", () => {
  const actorUserId = parseTestUserId("effect-grants-owner");
  const invitedUserId = parseTestUserId("effect-grants-invited");
  const accountId = parseTestAccountId();
  const accessId = parseTestAccessId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeAccountSharingStoreServiceTestService({
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
  const testLayer = accountSharingStateLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* listAccountAccessGrantsEffect() {
    const svc = yield* AccountSharingStateService;
    const grants = yield* svc.listAccountAccessGrants({
      accountId,
      actorUserId,
    });

    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      accessId,
      invitedUserId,
      status: "accepted",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect(
  "rejects account access grants for accounts owned by another user",
  () => {
    const actorUserId = parseTestUserId("effect-grants-attacker");
    const ownerUserId = parseTestUserId("effect-grants-real-owner");
    const accountId = parseTestAccountId();
    const store = makeAccountSharingStoreServiceTestService({
      findOwnedAccountForSharing: () =>
        Effect.succeed({
          accountId,
          displayName: parseTestDisplayName(),
          ownerUserId,
          profileId: parseTestProfileId(),
        }),
    });
    const testLayer = accountSharingStateLayer.pipe(
      Layer.provide(Layer.succeed(AccountSharingStoreService, store))
    );

    return Effect.gen(function* listAccountAccessGrantsForbiddenEffect() {
      const svc = yield* AccountSharingStateService;
      const error = yield* Effect.flip(
        svc.listAccountAccessGrants({ accountId, actorUserId })
      );

      expect(error._tag).toBe("ActorDoesNotOwnMargonemAccount");
    }).pipe(Effect.provide(testLayer));
  }
);
