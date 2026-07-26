import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { makeAccountSharingStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";
import { send } from "./send-account-access-invite-service.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));

const parseTestAccessId = () =>
  Effect.runSync(parseMargonemAccountAccessId(456));

const fixedClock = {
  now: () => new Date("2026-06-29T12:00:00.000Z"),
};

it.effect("sends an account access invite for a verified target", () => {
  const actorUserId = parseTestUserId("effect-account-send-owner");
  const targetUserId = parseTestUserId("effect-account-send-target");
  const accountId = parseTestAccountId();
  const accessId = parseTestAccessId();
  const displayName = Effect.runSync(parseAccountDisplayName("Send account"));
  const store = makeAccountSharingStoreServiceTestService({
    findAccountOwnerUserId: (input) => {
      expect(input).toEqual({ accountId });

      return Effect.succeed(actorUserId);
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
        accountDisplayName: displayName,
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
  const testLayer = Layer.succeed(AccountSharingStoreService, store);

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* send({
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
    findAccountOwnerUserId: () => Effect.succeed(actorUserId),
  });
  const testLayer = Layer.succeed(AccountSharingStoreService, store);

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      send({
        accountId,
        actorUserId,
        invitedUserId: actorUserId,
      })
    );

    expect(error._tag).toBe("CannotInviteSelf");
  }).pipe(Effect.provide(testLayer));
});
