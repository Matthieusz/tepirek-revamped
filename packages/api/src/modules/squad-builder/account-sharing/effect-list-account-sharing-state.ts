import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import type { AccountSharingError } from "./account-sharing-error";
import type {
  AccountAccessInviteSummary,
  SharedMargonemAccountSummary,
} from "./account-sharing-store";
import type {
  ListIncomingAccountInvitesInput,
  ListSharedAccountsInput,
} from "./list-account-sharing-state";

/** Effect service module that reads account sharing state for the actor. */
export class EffectListAccountSharingState {
  private readonly serviceName = "EffectListAccountSharingState";

  /** List pending account access invites received by the actor. */
  listIncomingInvites(
    input: ListIncomingAccountInvitesInput
  ): Effect<
    readonly AccountAccessInviteSummary[],
    AccountSharingError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* listIncomingAccountInvitesEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.listIncomingAccountInvites({
          actorUserId: input.actorUserId,
        })
      );
    });
  }

  /** List Margonem accounts shared with (accepted by) the actor. */
  listSharedAccounts(
    input: ListSharedAccountsInput
  ): Effect<
    readonly SharedMargonemAccountSummary[],
    AccountSharingError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectRuntime.gen(function* listSharedAccountsEffect() {
      return yield* EffectSquadGroupStore.use((store) =>
        store.listSharedAccounts({
          actorUserId: input.actorUserId,
        })
      );
    });
  }
}
