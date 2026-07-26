import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { makeAccountSharingStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";
import { search } from "./search-account-invite-targets-service.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));
it.effect("searches invite targets for an account owner", () => {
  const actorUserId = parseTestUserId("effect-account-search-owner");
  const targetUserId = parseTestUserId("effect-account-search-target");
  const accountId = parseTestAccountId();
  const store = makeAccountSharingStoreServiceTestService({
    findAccountOwnerUserId: (input) => {
      expect(input).toEqual({ accountId });

      return Effect.succeed(actorUserId);
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
  const testLayer = Layer.succeed(AccountSharingStoreService, store);

  return Effect.gen(function* searchInviteTargetsEffect() {
    const targets = yield* search({
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
