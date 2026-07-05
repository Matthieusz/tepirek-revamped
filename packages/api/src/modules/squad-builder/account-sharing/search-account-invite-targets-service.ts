import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";
import * as Layer from "effect/Layer";

import { serviceUse } from "../../../effect/service-use.js";
import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import { AccountSharingStoreService } from "./account-sharing-store-service.js";
import type { AccountInviteTarget } from "./account-sharing-store.js";
import {
  accountInviteTargetSearchPolicy,
  InvalidAccountInviteTargetQuery,
} from "./search-account-invite-targets.js";
import type { SearchAccountInviteTargetsInput } from "./search-account-invite-targets.js";

const parseAccountInviteTargetQuery = (
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
  /** Search verified users the account owner may invite. */
  readonly search: (
    input: SearchAccountInviteTargetsInput
  ) => Effect<readonly AccountInviteTarget[], AccountSharingError>;
}

/** Service module that searches verified users an owner may invite. */
// oxlint-disable-next-line max-classes-per-file -- Service tag lives with its use-case implementation.
export class Service extends Context.Service<Service, Interface>()(
  "@tepirek-revamped/api/squad-builder/AccountInviteTargets"
) {}

export const use = serviceUse(Service);

export const layer = Layer.effect(
  Service,
  EffectRuntime.gen(function* makeAccountInviteTargetsService() {
    const store = yield* AccountSharingStoreService;

    return {
      search: EffectRuntime.fn("AccountInviteTargets.search")(
        function* search(input) {
          const query = yield* parseAccountInviteTargetQuery(input.query);
          const owned = yield* store.findOwnedAccountForSharing({
            accountId: input.accountId,
            actorUserId: input.actorUserId,
          });

          if (owned.ownerUserId !== input.actorUserId) {
            return yield* new ActorDoesNotOwnMargonemAccount();
          }

          return yield* store.searchInviteTargets({
            accountId: input.accountId,
            actorUserId: input.actorUserId,
            query,
          });
        }
      ),
    };
  })
);
