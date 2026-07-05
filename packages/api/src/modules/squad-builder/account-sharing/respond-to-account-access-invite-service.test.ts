import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemAccountAccessId } from "../margonem-account-access-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import { ActorIsNotInviteRecipient } from "../squad-groups/squad-group-errors.js";
import { makeAccountSharingStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountSharingStoreService } from "./account-sharing-store-service.js";
import {
  layer as accountAccessInviteResponsesLayer,
  use as accountAccessInviteResponses,
} from "./respond-to-account-access-invite-service.js";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));

const parseTestAccessId = () =>
  Effect.runSync(parseMargonemAccountAccessId(456));

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("accepts an account access invite as the invited user", () => {
  const actorUserId = parseTestUserId("effect-account-respond-recipient");
  const ownerUserId = parseTestUserId("effect-account-respond-owner");
  const accessId = parseTestAccessId();
  const accountId = parseTestAccountId();
  const store = makeAccountSharingStoreServiceTestService({
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
  const testLayer = accountAccessInviteResponsesLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* respondToAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* accountAccessInviteResponses.respond({
      accessId,
      actorUserId,
      response: "accept",
    });

    expect(invite).toMatchObject({
      accessId,
      invitedUserId: actorUserId,
      status: "accepted",
    });
  }).pipe(Effect.provide(testLayer));
});

it.effect("surfaces invite recipient authorization failures", () => {
  const actorUserId = parseTestUserId("effect-account-respond-attacker");
  const accessId = parseTestAccessId();
  const store = makeAccountSharingStoreServiceTestService({
    respondToAccountAccessInvite: () => new ActorIsNotInviteRecipient(),
  });
  const testLayer = accountAccessInviteResponsesLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* respondToAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      accountAccessInviteResponses.respond({
        accessId,
        actorUserId,
        response: "decline",
      })
    );

    expect(error._tag).toBe("ActorIsNotInviteRecipient");
  }).pipe(Effect.provide(testLayer));
});
