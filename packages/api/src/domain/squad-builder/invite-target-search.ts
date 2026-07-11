import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Schema from "effect/Schema";

/** Shared policy for account and squad-group invite-target searches. */
export const inviteTargetSearchPolicy = {
  maxQueryLength: 40,
  maxResults: 10,
  minQueryLength: 2,
} as const;

/** Expected failure when an invite-target search query violates policy. */
export class InvalidAccountInviteTargetQuery extends Schema.TaggedErrorClass<InvalidAccountInviteTargetQuery>()(
  "InvalidAccountInviteTargetQuery",
  { message: Schema.String },
  {}
) {}

/** Parse and normalize an invite-target query according to the shared policy. */
export const parseInviteTargetQuery = (
  input: string
): Effect<string, InvalidAccountInviteTargetQuery> => {
  const trimmed = input.trim();

  if (trimmed.length < inviteTargetSearchPolicy.minQueryLength) {
    return EffectRuntime.fail(
      new InvalidAccountInviteTargetQuery({
        message: `Wpisz co najmniej ${inviteTargetSearchPolicy.minQueryLength} znaki`,
      })
    );
  }

  if (trimmed.length > inviteTargetSearchPolicy.maxQueryLength) {
    return EffectRuntime.fail(
      new InvalidAccountInviteTargetQuery({
        message: `Zapytanie może mieć maksymalnie ${inviteTargetSearchPolicy.maxQueryLength} znaków`,
      })
    );
  }

  return EffectRuntime.succeed(trimmed);
};
