import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id";
import { parseMargonemAccountId } from "../margonem-account-id";
import { isOk } from "../result";
import { makeEffectAccountSharingStoreTestService } from "../squad-groups/effect-squad-group-store.test-support";
import { EffectAccountSharingStore } from "./effect-account-sharing-store";
import { EffectSendAccountAccessInvite } from "./effect-send-account-access-invite";

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
  const store = makeEffectAccountSharingStoreTestService({
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
  const service = new EffectSendAccountAccessInvite(fixedClock);

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    const invite = yield* service.send({
      accountId,
      actorUserId,
      invitedUserId: targetUserId,
    });

    expect(invite).toMatchObject({
      accessId,
      invitedUserId: targetUserId,
      status: "pending",
    });
  }).pipe(Effect.provideService(EffectAccountSharingStore)(store));
});

it.effect("rejects self-invites before resolving the target", () => {
  const actorUserId = parseTestUserId("effect-account-self-owner");
  const accountId = parseTestAccountId();
  const store = makeEffectAccountSharingStoreTestService({
    findOwnedAccountForSharing: () =>
      Effect.succeed({
        accountId,
        displayName: "Self account" as never,
        ownerUserId: actorUserId,
        profileId: 7_298_897 as never,
      }),
  });
  const service = new EffectSendAccountAccessInvite(fixedClock);

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    const error = yield* Effect.flip(
      service.send({
        accountId,
        actorUserId,
        invitedUserId: actorUserId,
      })
    );

    expect(error._tag).toBe("CannotInviteSelf");
  }).pipe(Effect.provideService(EffectAccountSharingStore)(store));
});
