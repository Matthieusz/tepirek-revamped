import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { parseAppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import { parseMargonemAccountAccessId } from "../../../domain/squad-builder/margonem-account-access-id.ts";
import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { makeAccountSharingStoreServiceTestService } from "../../../test/squad-builder/squad-group-store.ts";
import { AccountSharingStoreService } from "./account-sharing-store.ts";
import { listAccountAccessGrants } from "./list-account-access-grants.ts";

const parseTestUserId = (value: string) =>
  Effect.runSync(parseAppUserId(value));

const parseTestAccountId = () => Effect.runSync(parseMargonemAccountId(123));

const parseTestAccessId = () =>
  Effect.runSync(parseMargonemAccountAccessId(456));

it.effect("lists account access grants for an owned account", () => {
  const actorUserId = parseTestUserId("effect-grants-owner");
  const invitedUserId = parseTestUserId("effect-grants-invited");
  const accountId = parseTestAccountId();
  const accessId = parseTestAccessId();
  const createdAt = new Date("2026-06-29T12:00:00.000Z");
  const store = makeAccountSharingStoreServiceTestService({
    findAccountOwnerUserId: (input) => {
      expect(input).toEqual({ accountId });

      return Effect.succeed(actorUserId);
    },
    listAccountAccessGrants: (input) => {
      expect(input).toEqual({ accountId });

      return Effect.succeed([
        {
          accessId,
          createdAt,
          invitedUserId,
          invitedUserImage: null,
          invitedUserName: "Effect Invited",
          status: "accepted",
          updatedAt: createdAt,
        },
      ]);
    },
  });

  return Effect.gen(function* listAccountAccessGrantsEffect() {
    const grants = yield* listAccountAccessGrants({ accountId, actorUserId });

    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      accessId,
      invitedUserId,
      status: "accepted",
    });
  }).pipe(Effect.provide(Layer.succeed(AccountSharingStoreService, store)));
});

it.effect(
  "rejects account access grants for accounts owned by another user",
  () => {
    const actorUserId = parseTestUserId("effect-grants-attacker");
    const ownerUserId = parseTestUserId("effect-grants-real-owner");
    const accountId = parseTestAccountId();
    const store = makeAccountSharingStoreServiceTestService({
      findAccountOwnerUserId: () => Effect.succeed(ownerUserId),
    });

    return Effect.gen(function* listAccountAccessGrantsForbiddenEffect() {
      const error = yield* Effect.flip(
        listAccountAccessGrants({ accountId, actorUserId })
      );

      expect(error._tag).toBe("ActorDoesNotOwnMargonemAccount");
    }).pipe(Effect.provide(Layer.succeed(AccountSharingStoreService, store)));
  }
);
