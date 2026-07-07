import type { InvalidAccountDisplayName } from "../../../domain/squad-builder/account-display-name.js";
import type { AppUserId } from "../../../domain/squad-builder/app-user-id.js";
import type { PendingMargonemAccountImportId } from "../../../domain/squad-builder/pending-margonem-account-import-id.js";
import type {
  DuplicateMargonemAccountError,
  PendingMargonemAccountImportNotFound,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";

/** Input for confirming an owned account import. */
export interface ConfirmOwnedAccountImportInput {
  readonly actorUserId: AppUserId;
  readonly pendingImportId: PendingMargonemAccountImportId;
  readonly displayName: string;
}

/** Expected failures returned by the confirm owned account import service. */
export type ConfirmOwnedAccountImportError =
  | InvalidAccountDisplayName
  | PendingMargonemAccountImportNotFound
  | DuplicateMargonemAccountError
  | SquadBuilderPersistenceUnavailable;
