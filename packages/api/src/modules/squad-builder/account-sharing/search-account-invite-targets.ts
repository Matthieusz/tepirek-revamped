import * as Schema from "effect/Schema";

import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type {
  AccountInviteTarget,
  AccountSharingStore,
} from "./account-sharing-store.js";

/** Search policy for account invite target queries. */
export const accountInviteTargetSearchPolicy = {
  maxQueryLength: 40,
  maxResults: 10,
  minQueryLength: 2,
} as const;

/** Expected failure when an invite target search query is invalid. */
export class InvalidAccountInviteTargetQuery extends Schema.TaggedErrorClass<InvalidAccountInviteTargetQuery>()(
  "InvalidAccountInviteTargetQuery",
  { message: Schema.String },
  {}
) {}

/** Input for searching account invite targets. */
export interface SearchAccountInviteTargetsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly query: string;
}

const parseAccountInviteTargetQuery = (
  input: string
): Outcome<string, InvalidAccountInviteTargetQuery> => {
  const trimmed = input.trim();

  if (trimmed.length < accountInviteTargetSearchPolicy.minQueryLength) {
    return fail(
      new InvalidAccountInviteTargetQuery({
        message: `Wpisz co najmniej ${accountInviteTargetSearchPolicy.minQueryLength} znaki`,
      })
    );
  }

  if (trimmed.length > accountInviteTargetSearchPolicy.maxQueryLength) {
    return fail(
      new InvalidAccountInviteTargetQuery({
        message: `Zapytanie może mieć maksymalnie ${accountInviteTargetSearchPolicy.maxQueryLength} znaków`,
      })
    );
  }

  return success(trimmed);
};

// oxlint-disable-next-line max-classes-per-file — Domain error schema collocated with the service that uses it.
export class SearchAccountInviteTargets {
  private readonly store: AccountSharingStore;

  constructor(store: AccountSharingStore) {
    this.store = store;
  }

  /** Search verified users the account owner may invite. */
  async search(
    input: SearchAccountInviteTargetsInput
  ): Promise<Outcome<readonly AccountInviteTarget[], AccountSharingError>> {
    const query = parseAccountInviteTargetQuery(input.query);

    if (isFailure(query)) {
      return fail(query.error);
    }

    const owned = await this.store.findOwnedAccountForSharing({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
    });

    if (isFailure(owned)) {
      return fail(owned.error);
    }

    if (owned.value.ownerUserId !== input.actorUserId) {
      return fail({ _tag: "ActorDoesNotOwnMargonemAccount" });
    }

    const targets = await this.store.searchInviteTargets({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
      query: query.value,
    });

    if (isFailure(targets)) {
      return fail(targets.error);
    }

    return success(targets.value);
  }
}
