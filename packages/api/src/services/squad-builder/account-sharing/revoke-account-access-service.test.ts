import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { makeAccountSharingStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import {
  layer as accountAccessRevocationsLayer,
  AccountAccessRevocationsService,
} from "./revoke-account-access-service.ts";

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
    const svc = yield* AccountAccessRevocationsService;
    yield* TestClock.setTime(fixedClock.now().getTime());
    const revoked = yield* svc.revoke({
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
    const svc = yield* AccountAccessRevocationsService;
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      svc.revoke({
        accessId,
        actorUserId,
      })
    );

    expect(error._tag).toBe("ActorDoesNotOwnMargonemAccount");
  }).pipe(Effect.provide(testLayer));
});
