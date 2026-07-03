import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import { isOk } from "../result.js";
import { makeEffectAccountSharingStoreTestService } from "../squad-groups/effect-squad-group-store.test-support.js";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import {
  layer as accountAccessRevocationsLayer,
  use as accountAccessRevocations,
} from "./effect-revoke-account-access.js";

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
  const store = makeEffectAccountSharingStoreTestService({
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
  const testLayer = accountAccessRevocationsLayer.pipe(
    Layer.provide(Layer.succeed(EffectAccountSharingStore, store))
  );

  return Effect.gen(function* revokeAccountAccessEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const revoked = yield* accountAccessRevocations.revoke({
      accessId,
      actorUserId,
    });

    expect(revoked).toMatchObject({
      accessId,
      accountId,
      removedSquadCharacterCount: 2,
      revokedUserId,
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("surfaces owner authorization failures", () => {
  const actorUserId = parseTestUserId("effect-account-revoke-attacker");
  const accessId = parseTestAccessId();
  const store = makeEffectAccountSharingStoreTestService({
    revokeAccountAccess: () => new ActorDoesNotOwnMargonemAccount(),
  });
  const testLayer = accountAccessRevocationsLayer.pipe(
    Layer.provide(Layer.succeed(EffectAccountSharingStore, store))
  );

  return Effect.gen(function* revokeAccountAccessEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      accountAccessRevocations.revoke({
        accessId,
        actorUserId,
      })
    );

    expect(error._tag).toBe("ActorDoesNotOwnMargonemAccount");
  }).pipe(Effect.provide(testLayer));
});
