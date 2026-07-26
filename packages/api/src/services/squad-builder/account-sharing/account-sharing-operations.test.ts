import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { makeAccountSharingStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import {
  ActorDoesNotOwnMargonemAccount,
  ActorIsNotInviteRecipient,
} from "../squad-groups/squad-group-errors.ts";
import { respond, revoke } from "./account-sharing-operations.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";

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
  const displayName = Effect.runSync(
    parseAccountDisplayName("Respond account")
  );
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
        accountDisplayName: displayName,
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
  const testLayer = Layer.succeed(AccountSharingStoreService, store);

  return Effect.gen(function* respondToAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const invite = yield* respond({
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
  const testLayer = Layer.succeed(AccountSharingStoreService, store);

  return Effect.gen(function* respondToAccountAccessInviteEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      respond({
        accessId,
        actorUserId,
        response: "decline",
      })
    );

    expect(error._tag).toBe("ActorIsNotInviteRecipient");
  }).pipe(Effect.provide(testLayer));
});

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
  const testLayer = Layer.succeed(AccountSharingStoreService, store);

  return Effect.gen(function* revokeAccountAccessEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const revoked = yield* revoke({
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
  const testLayer = Layer.succeed(AccountSharingStoreService, store);

  return Effect.gen(function* revokeAccountAccessEffect() {
    yield* TestClock.setTime(fixedClock.now().getTime());
    const error = yield* Effect.flip(
      revoke({
        accessId,
        actorUserId,
      })
    );

    expect(error._tag).toBe("ActorDoesNotOwnMargonemAccount");
  }).pipe(Effect.provide(testLayer));
});
