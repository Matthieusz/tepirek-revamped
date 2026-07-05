import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../app-user-id.js";
import { parseMargonemAccountId } from "../margonem-account-id.js";
import { isSuccess } from "../outcome.js";
import { makeAccountSharingStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.js";
import { AccountSharingStoreService } from "./account-sharing-store-service.js";
import {
  layer as accountInviteTargetsLayer,
  use as accountInviteTargets,
} from "./search-account-invite-targets-service.js";

const parseTestUserId = (value: string) => {
  const userId = parseAppUserId(value);

  if (!isSuccess(userId)) {
    throw new Error("Expected test user id to be valid");
  }

  return userId.value;
};

const parseTestAccountId = () => {
  const accountId = parseMargonemAccountId(123);

  if (!isSuccess(accountId)) {
    throw new Error("Expected test account id to be valid");
  }

  return accountId.value;
};

it.effect("searches invite targets for an account owner", () => {
  const actorUserId = parseTestUserId("effect-account-search-owner");
  const targetUserId = parseTestUserId("effect-account-search-target");
  const accountId = parseTestAccountId();
  const store = makeAccountSharingStoreServiceTestService({
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
    Layer.provide(Layer.succeed(AccountSharingStoreService, store))
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
