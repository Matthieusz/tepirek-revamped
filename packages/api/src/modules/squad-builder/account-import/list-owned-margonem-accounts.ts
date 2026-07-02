import type { Effect } from "effect/Effect";

import type { AppUserId } from "../app-user-id";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import type {
  OwnedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store";

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Expected failures returned by the list owned accounts service. */
export type ListOwnedMargonemAccountsError = SquadBuilderPersistenceUnavailable;

/** Service module that lists Margonem accounts owned by the actor. */
export class ListOwnedMargonemAccounts {
  private readonly serviceName = "ListOwnedMargonemAccounts";

  /** List Margonem accounts owned by the actor. */
  list(
    input: ListOwnedMargonemAccountsInput
  ): Effect<
    readonly OwnedMargonemAccountSummary[],
    ListOwnedMargonemAccountsError,
    EffectSquadGroupStore
  > {
    void this.serviceName;

    return EffectSquadGroupStore.use((store) =>
      store.listOwnedAccounts({
        actorUserId: input.actorUserId,
      })
    );
  }
}
