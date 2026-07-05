import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import { isOk } from "../result.js";
import { makeAccountSharingStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountSharingStoreService } from "./account-sharing-store-service.js";
import {
  layer as accountAccessInvitesLayer,
  use as accountAccessInvites,
} from "./send-account-access-invite-service.js";

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

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("sends an account access invite for a verified target", () => {
  const actorUserId = parseTestUserId("effect-account-send-owner");
  const targetUserId = parseTestUserId("effect-account-send-target");
  const accountId = parseTestAccountId();
  const accessId = parseTestAccessId();
  const store = makeAccountSharingStoreServiceTestService({
    findOwnedAccountForSharing: (input) => {
      expect(input.accountId).toBe(accountId);
      expect(input.actorUserId).toBe(actorUserId);

      return Effect.succeed({
        accountId: input.accountId,
        displayName: "Send account" as never,
        ownerUserId: actorUserId,
        profileId: 7_298_897 as never,
      });
    },
    findVerifiedInviteTarget: (input) => {
      expect(input.targetUserId).toBe(targetUserId);

      return Effect.succeed({
        image: null,
        name: "Send Target",
        userId: targetUserId,
      });
    },
    upsertAccountAccessInvite: (input) => {
      expect(input).toMatchObject({
        accountId,
        invitedUserId: targetUserId,
        now: fixedClock.now(),
        ownerUserId: actorUserId,
      });

      return Effect.succeed({
        accessId,
        accountDisplayName: "Send account" as never,
        accountId,
        createdAt: fixedClock.now(),
        generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
        invitedUserId: targetUserId,
        ownerUserId: actorUserId,
        ownerUserImage: null,
        ownerUserName: "owner",
        status: "pending" as const,
        updatedAt: fixedClock.now(),
      });
    },
  });
  const testLayer = accountAccessInvitesLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* accountAccessInvites.send({
      accountId,
      actorUserId,
      invitedUserId: targetUserId,
    });

    expect(invite).toMatchObject({
      accessId,
      invitedUserId: targetUserId,
      status: "pending",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("rejects self-invites before resolving the target", () => {
  const actorUserId = parseTestUserId("effect-account-self-owner");
  const accountId = parseTestAccountId();
  const store = makeAccountSharingStoreServiceTestService({
    findOwnedAccountForSharing: () =>
      Effect.succeed({
        accountId,
        displayName: "Self account" as never,
        ownerUserId: actorUserId,
        profileId: 7_298_897 as never,
      }),
  });
  const testLayer = accountAccessInvitesLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      accountAccessInvites.send({
        accountId,
        actorUserId,
        invitedUserId: actorUserId,
      })
    );

    expect(error._tag).toBe("CannotInviteSelf");
  }).pipe(Effect.provide(testLayer));
});
