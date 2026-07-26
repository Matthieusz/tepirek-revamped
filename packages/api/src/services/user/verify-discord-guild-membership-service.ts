import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { DiscordGuildVerifier } from "../../adapters/user/discord-verification-service.ts";
import { UserStore } from "../../adapters/user/user-store.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";

/** Input identifying the application user whose linked Discord account is checked. */
export interface VerifyDiscordGuildMembershipInput {
  readonly userId: AppUserId;
}

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
