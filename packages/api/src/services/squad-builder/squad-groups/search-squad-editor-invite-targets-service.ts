import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  accountInviteTargetSearchPolicy,
  InvalidAccountInviteTargetQuery,
} from "../account-sharing/search-account-invite-targets.js";
import type { SearchSquadEditorInviteTargets } from "./search-squad-editor-invite-targets.js";
import type { SquadGroupSharingError } from "./squad-group-sharing-error.js";
import { SquadGroupStoreService } from "./squad-group-store.js";
import type { SquadEditorInviteTarget } from "./squad-group-store.js";

const parseSquadEditorInviteTargetQuery = (
  input: string
): Effect<string, InvalidAccountInviteTargetQuery> => {
  const trimmed = input.trim();

  if (trimmed.length < accountInviteTargetSearchPolicy.minQueryLength) {
    return EffectRuntime.fail(
      new InvalidAccountInviteTargetQuery({
        message: `Wpisz co najmniej ${accountInviteTargetSearchPolicy.minQueryLength} znaki`,
      })
    );
  }

  if (trimmed.length > accountInviteTargetSearchPolicy.maxQueryLength) {
    return EffectRuntime.fail(
      new InvalidAccountInviteTargetQuery({
        message: `Zapytanie może mieć maksymalnie ${accountInviteTargetSearchPolicy.maxQueryLength} znaków`,
      })
    );
  }

  return EffectRuntime.succeed(trimmed);
};

export interface Interface {
  /** Search verified users the squad group owner may invite as editors. */
  readonly search: (
    input: Parameters<SearchSquadEditorInviteTargets["search"]>[0]
  ) => Effect<readonly SquadEditorInviteTarget[], SquadGroupSharingError>;
}

/** Service module that searches verified users a squad group owner may invite as editors. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/SquadEditorInviteTargets"
) {}

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeSquadEditorInviteTargetsService() {
    const store = yield* SquadGroupStoreService;

    return {
      search: EffectRuntime.fn("SquadGroupEditorInvites.searchTargets")(
        function* search(input) {
          const query = yield* parseSquadEditorInviteTargetQuery(input.query);

          yield* store.authorizeSquadGroupOwner({
            actorUserId: input.actorUserId,
            groupId: input.groupId,
          });

          return yield* store.searchSquadEditorInviteTargets({
            groupId: input.groupId,
            maxResults: accountInviteTargetSearchPolicy.maxResults,
            ownerUserId: input.actorUserId,
            query,
          });
        }
      ),
    };
  })
);
