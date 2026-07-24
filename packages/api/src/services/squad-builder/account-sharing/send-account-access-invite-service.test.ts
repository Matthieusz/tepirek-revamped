import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { makeAccountSharingStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import {
  layer as accountAccessInvitesLayer,
  AccountAccessInvitesService,
} from "./send-account-access-invite-service.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));

const parseTestAccessId = () =>
  Effect.runSync(parseMargonemAccountAccessId(456));

const profileId = Effect.runSync(parseMargonemProfileId(7_298_897));

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
    findOwnedAccountForSharing: (input) => {
      expect(input.accountId).toBe(accountId);
      expect(input.actorUserId).toBe(actorUserId);

      return Effect.succeed({
        accountId: input.accountId,
        displayName,
        ownerUserId: actorUserId,
        profileId,
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
  const testLayer = accountAccessInvitesLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    const svc = yield* AccountAccessInvitesService;
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* svc.send({
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
  const displayName = Effect.runSync(parseAccountDisplayName("Self account"));
  const store = makeAccountSharingStoreServiceTestService({
    findOwnedAccountForSharing: () =>
      Effect.succeed({
        accountId,
        displayName,
        ownerUserId: actorUserId,
        profileId,
      }),
  });
  const testLayer = accountAccessInvitesLayer.pipe(
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
  );

  return Effect.gen(function* sendAccountAccessInviteEffect() {
    const svc = yield* AccountAccessInvitesService;
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      svc.send({
        accountId,
        actorUserId,
        invitedUserId: actorUserId,
      })
    );

    expect(error._tag).toBe("CannotInviteSelf");
  }).pipe(Effect.provide(testLayer));
});
