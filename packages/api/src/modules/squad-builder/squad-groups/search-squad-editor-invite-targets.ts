import {
  accountInviteTargetSearchPolicy,
  InvalidAccountInviteTargetQuery,
} from "../account-sharing/search-account-invite-targets.js";
import type { AppUserId } from "../app-user-id.js";
import { fail, isFailure, success } from "../outcome.js";
import type { Outcome } from "../outcome.js";
import type { SquadGroupId } from "../squad-group-id.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import type {
  SquadEditorInviteTarget,
  SquadGroupSharingStore,
} from "./squad-group-store.js";

const parseQuery = (
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

/** Search verified users the squad group owner may invite as editors. */
export class SearchSquadEditorInviteTargets {
  private readonly store: SquadGroupSharingStore;

  constructor(store: SquadGroupSharingStore) {
    this.store = store;
  }

  async search(input: {
    readonly actorUserId: AppUserId;
    readonly groupId: SquadGroupId;
    readonly query: string;
  }): Promise<
    Outcome<readonly SquadEditorInviteTarget[], SquadGroupSharingError>
  > {
    const query = parseQuery(input.query);

    if (isFailure(query)) {
      return fail(query.error);
    }

    const access = await this.store.authorizeSquadGroupOwner({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    if (isFailure(access)) {
      return fail(access.error);
    }

    const targets = await this.store.searchSquadEditorInviteTargets({
      groupId: input.groupId,
      maxResults: accountInviteTargetSearchPolicy.maxResults,
      ownerUserId: input.actorUserId,
      query: query.value,
    });

    if (isFailure(targets)) {
      return fail(targets.error);
    }

    return success(targets.value);
  }
}
