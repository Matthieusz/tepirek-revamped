import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parseMargonemProfileId } from "../../../domain/squad-builder/margonem-profile-id.ts";
import { makeAccountSharingStoreServiceTestService } from "../squad-groups/squad-group-store.test-support.ts";
import { AccountSharingStoreService } from "./account-sharing-store-service.ts";
import {
  layer as accountInviteTargetsLayer,
  AccountInviteTargetsService,
} from "./search-account-invite-targets-service.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));
const displayName = Effect.runSync(parseAccountDisplayName("Search account"));
const profileId = Effect.runSync(parseMargonemProfileId(7_298_897));

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
        displayName,
        ownerUserId: actorUserId,
        profileId,
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
    const svc = yield* AccountInviteTargetsService;
    const targets = yield* svc.search({
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
