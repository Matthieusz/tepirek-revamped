import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id";
import { parseMargonemAccountId } from "../margonem-account-id";
import { isOk } from "../result";
import { makeEffectAccountSharingStoreTestService } from "../squad-groups/effect-squad-group-store.test-support";
import { EffectAccountSharingStore } from "./effect-account-sharing-store";
import { EffectRespondToAccountAccessInvite } from "./effect-respond-to-account-access-invite";

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

it.effect("accepts an account access invite as the invited user", () => {
  const actorUserId = parseTestUserId("effect-account-respond-recipient");
  const ownerUserId = parseTestUserId("effect-account-respond-owner");
  const accessId = parseTestAccessId();
  const accountId = parseTestAccountId();
  const store = makeEffectAccountSharingStoreTestService({
    respondToAccountAccessInvite: (input) => {
      expect(input).toMatchObject({
        accessId,
        invitedUserId: actorUserId,
        now: fixedClock.now(),
        response: "accept",
      });

      return Effect.succeed({
        accessId,
        accountDisplayName: "Respond account" as never,
        accountId,
        createdAt: fixedClock.now(),
        generatedProfileUrl: "https://www.margonem.pl/profile/view,7298897",
        invitedUserId: actorUserId,
        ownerUserId,
        ownerUserImage: null,
        ownerUserName: "owner",
        status: "accepted" as const,
        updatedAt: fixedClock.now(),
      });
    },
  });
  const service = new EffectRespondToAccountAccessInvite(fixedClock);

  return Effect.gen(function* respondToAccountAccessInviteEffect() {
    const invite = yield* service.respond({
      accessId,
      actorUserId,
      response: "accept",
    });

    expect(invite).toMatchObject({
      accessId,
      invitedUserId: actorUserId,
      status: "accepted",
    });
  }).pipe(Effect.provideService(EffectAccountSharingStore)(store));
});

it.effect("surfaces invite recipient authorization failures", () => {
  const actorUserId = parseTestUserId("effect-account-respond-attacker");
  const accessId = parseTestAccessId();
  const store = makeEffectAccountSharingStoreTestService({
    respondToAccountAccessInvite: () =>
      Effect.fail({ _tag: "ActorIsNotInviteRecipient" as const }),
  });
  const service = new EffectRespondToAccountAccessInvite(fixedClock);

  return Effect.gen(function* respondToAccountAccessInviteEffect() {
    const error = yield* Effect.flip(
      service.respond({
        accessId,
        actorUserId,
        response: "decline",
      })
    );

    expect(error._tag).toBe("ActorIsNotInviteRecipient");
  }).pipe(Effect.provideService(EffectAccountSharingStore)(store));
});
