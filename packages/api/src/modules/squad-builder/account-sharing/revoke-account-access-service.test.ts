import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.js";
import { makeAccountSharingStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountSharingStoreService } from "./account-sharing-store-service.js";
import {
  layer as accountAccessRevocationsLayer,
  use as accountAccessRevocations,
} from "./revoke-account-access-service.js";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));

const parseTestAccessId = () =>
  Effect.runSync(parseMargonemAccountAccessId(456));

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("revokes account access as the account owner", () => {
  const actorUserId = parseTestUserId("effect-account-revoke-owner");
  const revokedUserId = parseTestUserId("effect-account-revoke-recipient");
  const accessId = parseTestAccessId();
  const accountId = parseTestAccountId();
  const store = makeAccountSharingStoreServiceTestService({
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
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
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
  const store = makeAccountSharingStoreServiceTestService({
    revokeAccountAccess: () => new ActorDoesNotOwnMargonemAccount(),
  });
  const testLayer = accountAccessRevocationsLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
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
