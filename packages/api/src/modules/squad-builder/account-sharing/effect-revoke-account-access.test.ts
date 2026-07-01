import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";

import { parseAppUserId } from "../app-user-id";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id";
import { parseMargonemAccountId } from "../margonem-account-id";
import { isOk } from "../result";
import { makeEffectSquadGroupStoreTestService } from "../squad-groups/effect-squad-group-store.test-support";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import { EffectRevokeAccountAccess } from "./effect-revoke-account-access";

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

it.effect("revokes account access as the account owner", () => {
  const actorUserId = parseTestUserId("effect-account-revoke-owner");
  const revokedUserId = parseTestUserId("effect-account-revoke-recipient");
  const accessId = parseTestAccessId();
  const accountId = parseTestAccountId();
  const store = makeEffectSquadGroupStoreTestService({
    revokeAccountAccess: (input) => {
      expect(input).toMatchObject({
        accessId,
        now: fixedClock.now(),
        ownerUserId: actorUserId,
      });

      return Effect.succeed({
        accessId,
        accountId,
        removedSquadCharacterCount: 2,
        revokedUserId,
      });
    },
  });
  const service = new EffectRevokeAccountAccess(fixedClock);

  return Effect.gen(function* revokeAccountAccessEffect() {
    const revoked = yield* service.revoke({
      accessId,
      actorUserId,
    });

    expect(revoked).toMatchObject({
      accessId,
      accountId,
      removedSquadCharacterCount: 2,
      revokedUserId,
    });
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});

it.effect("surfaces owner authorization failures", () => {
  const actorUserId = parseTestUserId("effect-account-revoke-attacker");
  const accessId = parseTestAccessId();
  const store = makeEffectSquadGroupStoreTestService({
    revokeAccountAccess: () =>
      Effect.fail({ _tag: "ActorDoesNotOwnMargonemAccount" as const }),
  });
  const service = new EffectRevokeAccountAccess(fixedClock);

  return Effect.gen(function* revokeAccountAccessEffect() {
    const error = yield* Effect.flip(
      service.revoke({
        accessId,
        actorUserId,
      })
    );

    expect(error._tag).toBe("ActorDoesNotOwnMargonemAccount");
  }).pipe(Effect.provideService(EffectSquadGroupStore)(store));
});
