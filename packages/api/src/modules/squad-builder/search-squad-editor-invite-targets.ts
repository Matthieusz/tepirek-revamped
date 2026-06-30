import type { AppUserId } from "./app-user-id";
import { err, isError, ok } from "./result";
import type { Result } from "./result";
import { accountInviteTargetSearchPolicy } from "./search-account-invite-targets";
import type {
  SquadEditorInviteTarget,
  SquadGroupSharingStore,
} from "./squad-builder-store";
import type { SquadGroupId } from "./squad-group-id";
import type { SquadGroupSharingError } from "./squad-group-sharing-error";

const parseQuery = (
  input: string
): Result<
  string,
  { readonly _tag: "InvalidAccountInviteTargetQuery"; readonly message: string }
> => {
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
    Result<readonly SquadEditorInviteTarget[], SquadGroupSharingError>
  > {
    const query = parseQuery(input.query);

    if (isError(query)) {
      return err(query.error);
    }

    const access = await this.store.authorizeSquadGroupOwner({
      actorUserId: input.actorUserId,
      groupId: input.groupId,
    });

    if (isError(access)) {
      return err(access.error);
    }

    const targets = await this.store.searchSquadEditorInviteTargets({
      groupId: input.groupId,
      maxResults: accountInviteTargetSearchPolicy.maxResults,
      ownerUserId: input.actorUserId,
      query: query.value,
    });

    if (isError(targets)) {
      return err(targets.error);
    }

    return ok(targets.value);
  }
}
