import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { parseAccountDisplayName } from "../account-display-name";
import type { InvalidAccountDisplayName } from "../account-display-name";
import type { AppUserId } from "../app-user-id";
import type { PendingMargonemAccountImportId } from "../pending-margonem-account-import-id";
import { isError } from "../result";
import { EffectSquadGroupStore } from "../squad-groups/squad-group-store";
import type {
  DuplicateMargonemAccountError,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImportNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store";
import type { Clock } from "./preview-margonem-profile-import";

/** Input for confirming an owned account import through Effect. */
export interface EffectConfirmOwnedAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly displayName: string;
}

/** Expected failures returned by the Effect confirm owned account import service. */
export type EffectConfirmOwnedAccountImportError =
  | InvalidAccountDisplayName
  | PendingMargonemAccountImportNotFound
  | DuplicateMargonemAccountError
  | SquadBuilderPersistenceUnavailable;

/** Effect service module that confirms a pending import into an owned account. */
export class EffectConfirmOwnedAccountImport {
  private readonly clock: Clock;

  constructor(clock: Clock) {
    this.clock = clock;
  }

  /** Save a previously previewed Margonem account and its Jaruna characters. */
  confirm(
    input: EffectConfirmOwnedAccountImportInput
  ): Effect<
    OwnedMargonemAccountSummary,
    EffectConfirmOwnedAccountImportError,
    EffectSquadGroupStore
  > {
    const { clock } = this;

    return EffectRuntime.gen(function* confirmOwnedAccountImportEffect() {
      const displayName = parseAccountDisplayName(input.displayName);

      if (isError(displayName)) {
        return yield* EffectRuntime.fail(displayName.error);
      }

      const now = clock.now();
      const pending = yield* EffectSquadGroupStore.use((store) =>
        store.findPendingImportForConfirmation({
          actorUserId: input.actorUserId,
          now,
          pendingImportId: input.pendingImportId,
        })
      );

      return yield* EffectSquadGroupStore.use((store) =>
        store.createOwnedAccountFromPendingImport({
          actorUserId: input.actorUserId,
          displayName: displayName.value,
          pending,
        })
      );
    });
  }
}
