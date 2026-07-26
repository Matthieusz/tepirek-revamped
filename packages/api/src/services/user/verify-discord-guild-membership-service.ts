import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { DiscordGuildVerifier } from "../../adapters/user/discord-verification-service.ts";
import { UserStore } from "../../adapters/user/user-store.ts";
import type { UserAdapterError } from "../../adapters/user/user-store.ts";
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

/** Check Discord guild membership and persist successful user verification. */
export const verifyDiscordGuildMembership = Effect.fn(
  "User.verifyDiscordGuildMembership"
)(function* verifyDiscordGuildMembership(
  input: VerifyDiscordGuildMembershipInput
) {
  const store = yield* UserStore;
  const verifier = yield* DiscordGuildVerifier;
  const accessToken = yield* store.getDiscordAccessToken(input.userId);
  const valid = yield* verifier.verifyMembership(accessToken);

  if (valid) {
    const updatedAt = yield* DateTime.nowAsDate;
    yield* store.markUserVerified({ updatedAt, userId: input.userId });
  }

  return { valid };
});
