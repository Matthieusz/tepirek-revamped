import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { accountInviteTargetSearchPolicy } from "../account-sharing/search-account-invite-targets.js";
import type { InvalidAccountInviteTargetQuery } from "../account-sharing/search-account-invite-targets.js";
import type { SearchSquadEditorInviteTargets } from "./search-squad-editor-invite-targets.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { EffectSquadGroupStore } from "./squad-group-store.js";
import type { SquadEditorInviteTarget } from "./squad-group-store.js";

const parseSquadEditorInviteTargetQuery = (
  input: string
): Effect<string, InvalidAccountInviteTargetQuery> => {
  const trimmed = input.trim();

  if (trimmed.length < accountInviteTargetSearchPolicy.minQueryLength) {
    return EffectRuntime.fail({
      _tag: "InvalidAccountInviteTargetQuery" as const,
      message: `Wpisz co najmniej ${accountInviteTargetSearchPolicy.minQueryLength} znaki`,
    });
  }

  if (trimmed.length > accountInviteTargetSearchPolicy.maxQueryLength) {
    return EffectRuntime.fail({
      _tag: "InvalidAccountInviteTargetQuery" as const,
      message: `Zapytanie może mieć maksymalnie ${accountInviteTargetSearchPolicy.maxQueryLength} znaków`,
    });
  }

  return EffectRuntime.succeed(trimmed);
};

/** Effect service module that searches verified users a squad group owner may invite as editors. */
export class EffectSearchSquadEditorInviteTargets {
  private readonly serviceName = "EffectSearchSquadEditorInviteTargets";

  /** Search verified users the squad group owner may invite as editors. */
  search(
    input: Parameters<SearchSquadEditorInviteTargets["search"]>[0]
  ): Effect<
    readonly SquadEditorInviteTarget[],
    SquadGroupSharingError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* searchSquadEditorInviteTargetsEffect() {
      const query = yield* parseSquadEditorInviteTargetQuery(input.query);

      yield* EffectSquadGroupStore.use((store) =>
        store.authorizeSquadGroupOwner({
          actorUserId: input.actorUserId,
          groupId: input.groupId,
        })
      );

      return yield* EffectSquadGroupStore.use((store) =>
        store.searchSquadEditorInviteTargets({
          groupId: input.groupId,
          maxResults: accountInviteTargetSearchPolicy.maxResults,
          ownerUserId: input.actorUserId,
          query,
        })
      );
    });
  }
}
