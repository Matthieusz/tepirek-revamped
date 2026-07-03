import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import { isOk } from "../result.js";
import { makeEffectAccountSharingStoreTestService } from "../squad-groups/effect-squad-group-store.test-support.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import {
  layer as accountInviteTargetsLayer,
  use as accountInviteTargets,
} from "./effect-search-account-invite-targets.js";

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

it.effect("searches invite targets for an account owner", () => {
  const actorUserId = parseTestUserId("effect-account-search-owner");
  const targetUserId = parseTestUserId("effect-account-search-target");
  const accountId = parseTestAccountId();
  const store = makeEffectAccountSharingStoreTestService({
    findOwnedAccountForSharing: (input) => {
      expect(input.accountId).toBe(accountId);
      expect(input.actorUserId).toBe(actorUserId);

      return Effect.succeed({
        accountId: input.accountId,
        displayName: "Search account" as never,
        ownerUserId: actorUserId,
        profileId: 7_298_897 as never,
      });
    },
    searchInviteTargets: (input) => {
      expect(input.query).toBe("Target");
      expect(input.accountId).toBe(accountId);
      expect(input.actorUserId).toBe(actorUserId);

      return Effect.succeed([
        {
          image: null,
          name: "Search Target",
          userId: targetUserId,
        },
      ]);
    },
  });
  const testLayer = accountInviteTargetsLayer.pipe(
    Layer.provide(Layer.succeed(EffectAccountSharingStore, store))
  );

  return Effect.gen(function* searchInviteTargetsEffect() {
    const targets = yield* accountInviteTargets.search({
      accountId,
      actorUserId,
      query: "  Target  ",
    });

    expect(targets).toEqual([
      {
        image: null,
        name: "Search Target",
        userId: targetUserId,
      },
    ]);
  }).pipe(Effect.provide(testLayer));
});
