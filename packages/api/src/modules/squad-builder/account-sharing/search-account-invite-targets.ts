import type { AppUserId } from "../app-user-id.js";
import type { MargonemAccountId } from "../margonem-account-id.js";
import { err, isError, ok } from "../result.js";
import type { Result } from "../result.js";
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
export interface InvalidAccountInviteTargetQuery {
  readonly _tag: "InvalidAccountInviteTargetQuery";
  readonly message: string;
}

/** Input for searching account invite targets. */
export interface SearchAccountInviteTargetsInput {
  readonly actorUserId: AppUserId;
  readonly accountId: MargonemAccountId;
  readonly query: string;
}

const parseAccountInviteTargetQuery = (
  input: string
): Result<string, InvalidAccountInviteTargetQuery> => {
  const trimmed = input.trim();

  if (trimmed.length < accountInviteTargetSearchPolicy.minQueryLength) {
    return err({
      _tag: "InvalidAccountInviteTargetQuery",
      message: `Wpisz co najmniej ${accountInviteTargetSearchPolicy.minQueryLength} znaki`,
    });
  }

  if (trimmed.length > accountInviteTargetSearchPolicy.maxQueryLength) {
    return err({
      _tag: "InvalidAccountInviteTargetQuery",
      message: `Zapytanie może mieć maksymalnie ${accountInviteTargetSearchPolicy.maxQueryLength} znaków`,
    });
  }

  return ok(trimmed);
};

/** Service module that searches verified users an owner may invite. */
export class SearchAccountInviteTargets {
  private readonly store: AccountSharingStore;

  constructor(store: AccountSharingStore) {
    this.store = store;
  }

  /** Search verified users the account owner may invite. */
  async search(
    input: SearchAccountInviteTargetsInput
  ): Promise<Result<readonly AccountInviteTarget[], AccountSharingError>> {
    const query = parseAccountInviteTargetQuery(input.query);

    if (isError(query)) {
      return err(query.error);
    }

    const owned = await this.store.findOwnedAccountForSharing({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
    });

    if (isError(owned)) {
      return err(owned.error);
    }

    if (owned.value.ownerUserId !== input.actorUserId) {
      return err({ _tag: "ActorDoesNotOwnMargonemAccount" });
    }

    const targets = await this.store.searchInviteTargets({
      accountId: input.accountId,
      actorUserId: input.actorUserId,
      query: query.value,
    });

    if (isError(targets)) {
      return err(targets.error);
    }

    return ok(targets.value);
  }
}
