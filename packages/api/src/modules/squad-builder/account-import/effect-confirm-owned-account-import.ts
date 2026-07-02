import * as Clock from "effect/Clock";
import type { Effect } from "effect/Effect";
import * as EffectRuntime from "effect/Effect";

import { parseAccountDisplayName } from "../account-display-name.js";
import type { InvalidAccountDisplayName } from "../account-display-name.js";
import type { AppUserId } from "../app-user-id.js";
import type { PendingMargonemAccountImportId } from "../pending-margonem-account-import-id.js";
import { isError } from "../result.js";
import type {
  DuplicateMargonemAccountError,
  OwnedMargonemAccountSummary,
  PendingMargonemAccountImportNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";
import { EffectAccountImportStore } from "./effect-account-import-store.js";

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
  private readonly currentDate = Clock.currentTimeMillis.pipe(
    EffectRuntime.map((milliseconds) => new Date(milliseconds))
  );

  /** Save a previously previewed Margonem account and its Jaruna characters. */
  readonly confirm = (
    input: EffectConfirmOwnedAccountImportInput
  ): Effect<
    OwnedMargonemAccountSummary,
    EffectConfirmOwnedAccountImportError,
    EffectAccountImportStore
  > => {
    const { currentDate } = this;

    return EffectRuntime.gen(function* confirmOwnedAccountImportEffect() {
      const displayName = parseAccountDisplayName(input.displayName);

      if (isError(displayName)) {
        return yield* EffectRuntime.fail(displayName.error);
      }

      const now = yield* currentDate;
      const pending = yield* EffectAccountImportStore.use((store) =>
        store.findPendingImportForConfirmation({
          actorUserId: input.actorUserId,
          now,
          pendingImportId: input.pendingImportId,
        })
      );

      return yield* EffectAccountImportStore.use((store) =>
        store.createOwnedAccountFromPendingImport({
          actorUserId: input.actorUserId,
          displayName: displayName.value,
          pending,
        })
      );
    });
  };
}
