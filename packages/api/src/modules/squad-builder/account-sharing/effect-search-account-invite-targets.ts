import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { ActorDoesNotOwnMargonemAccount } from "../squad-groups/squad-group-errors.js";
import type { AccountSharingError } from "./account-sharing-error.js";
import type { AccountInviteTarget } from "./account-sharing-store.js";
import { EffectAccountSharingStore } from "./effect-account-sharing-store.js";
import {
  accountInviteTargetSearchPolicy,
  InvalidAccountInviteTargetQuery,
} from "./search-account-invite-targets.js";
import type { SearchAccountInviteTargetsInput } from "./search-account-invite-targets.js";

const parseAccountInviteTargetQuery = (
  input: string
): Effect<string, InvalidAccountInviteTargetQuery, never> => {
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

/** Effect service module that searches verified users an owner may invite. */
export class EffectSearchAccountInviteTargets {
  private readonly serviceName = "EffectSearchAccountInviteTargets";

  /** Search verified users the account owner may invite. */
  search(
    input: SearchAccountInviteTargetsInput
  ): Effect<
    readonly AccountInviteTarget[],
    AccountSharingError,
    EffectAccountSharingStore
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* searchAccountInviteTargetsEffect() {
      const query = yield* parseAccountInviteTargetQuery(input.query);
      const owned = yield* EffectAccountSharingStore.use((store) =>
        store.findOwnedAccountForSharing({
          accountId: input.accountId,
          actorUserId: input.actorUserId,
        })
      );

      if (owned.ownerUserId !== input.actorUserId) {
        return yield* new ActorDoesNotOwnMargonemAccount();
      }

      return yield* EffectAccountSharingStore.use((store) =>
        store.searchInviteTargets({
          accountId: input.accountId,
          actorUserId: input.actorUserId,
          query,
        })
      );
    });
  }
}
