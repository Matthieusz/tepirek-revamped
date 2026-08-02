import * as DateTime from "effect/DateTime";
import * as EffectRuntime from "effect/Effect";

import { parseAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { InvalidAccountDisplayName } from "../../../domain/squad-builder/account-display-name.ts";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.ts";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.ts";
import type {
  PendingMargonemAccountImportNotFound,
  SquadBuilderPersistenceUnavailable,
} from "../squad-groups/squad-group-errors.ts";
import { AccountImportStoreService } from "./account-import-store.ts";
import type { DuplicateMargonemAccountError } from "./account-import-store.ts";

/** Input for confirming an owned account import through the service. */
export interface ConfirmOwnedAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly displayName: string;
}

/** Expected failures returned by the Effect confirm owned account import service. */
export type ConfirmOwnedAccountImportError =
  | InvalidAccountDisplayName
  | PendingMargonemAccountImportNotFound
  | DuplicateMargonemAccountError
  | SquadBuilderPersistenceUnavailable;

const currentDate = DateTime.nowAsDate;

/** Save a previously previewed Margonem account and its Jaruna characters. */
export const confirm = EffectRuntime.fn("AccountImport.confirm")(
  function* confirmOwnedAccountImportEffect(
    input: ConfirmOwnedAccountImportInput
  ) {
    const store = yield* AccountImportStoreService;
    const displayName = yield* parseAccountDisplayName(input.displayName);

    const now = yield* currentDate;
    return yield* store.confirmPendingImport({
      actorUserId: input.actorUserId,
      displayName,
      now,
      pendingImportId: input.pendingImportId,
    });
  }
);
