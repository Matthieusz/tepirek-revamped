import * as Clock from "effect/Clock";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { DiscordGuildVerifier } from "../../adapters/user/discord-verification-service.ts";
import type { UserAdapterError } from "../../adapters/user/user-adapter-error.ts";
import { UserStore } from "../../adapters/user/user-store.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { UserBadRequest } from "../../protocol/user/http-api-contract.ts";

/** Input identifying the application user whose linked Discord account is checked. */
export interface VerifyDiscordGuildMembershipInput {
  readonly userId: AppUserId;
}

/**
 * Result of checking the linked Discord account's guild membership.
 * When `valid` is true, the user's verified state has also been persisted.
 */
export interface VerifyDiscordGuildMembershipResult {
  readonly valid: boolean;
}

/**
 * Expected failures from membership verification: a missing linked Discord
 * account or an unavailable persistence or Discord dependency.
 */
export type VerifyDiscordGuildMembershipError =
  | UserBadRequest
  | UserAdapterError;

const makeVerify = (
  store: typeof UserStore.Service,
  verifier: typeof DiscordGuildVerifier.Service
) =>
  Effect.fn("User.verifyDiscordGuildMembership")(
    function* verifyDiscordGuildMembership(
      input: VerifyDiscordGuildMembershipInput
    ) {
      const accessToken = yield* store.getDiscordAccessToken(input.userId);
      const valid = yield* verifier.verifyMembership(accessToken);

      if (valid) {
        const updatedAt = new Date(yield* Clock.currentTimeMillis);
        yield* store.markUserVerified({ updatedAt, userId: input.userId });
      }

      return { valid };
    }
  );

/** Application-service contract for verifying Discord guild membership. */
export interface VerifyDiscordGuildMembership {
  /**
   * Checks the user's linked Discord account and marks the user verified when
   * membership is present. Expected failures remain in the Effect error channel.
   */
  readonly verify: (
    input: VerifyDiscordGuildMembershipInput
  ) => Effect.Effect<
    VerifyDiscordGuildMembershipResult,
    VerifyDiscordGuildMembershipError
  >;
}

/**
 * Effect Context service for Discord guild membership verification.
 * Its live layer requires the user store and Discord guild verifier services.
 */
export class VerifyDiscordGuildMembershipService extends Context.Service<
  VerifyDiscordGuildMembershipService,
  VerifyDiscordGuildMembership
>()("@tepirek-revamped/api/user/VerifyDiscordGuildMembershipService") {
  /** Layer that constructs the service from its persistence and Discord ports. */
  static readonly layer = Layer.effect(
    VerifyDiscordGuildMembershipService,
    Effect.gen(function* verifyDiscordGuildMembershipLayer() {
      const store = yield* UserStore;
      const verifier = yield* DiscordGuildVerifier;

      return VerifyDiscordGuildMembershipService.of({
        verify: makeVerify(store, verifier),
      });
    })
  );
}
