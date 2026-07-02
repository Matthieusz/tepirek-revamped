import { parseAccountDisplayName } from "../account-display-name.js";
import type { InvalidAccountDisplayName } from "../account-display-name.js";
import type { AppUserId } from "../app-user-id.js";
import type { PendingMargonemAccountImportId } from "../pending-margonem-account-import-id.js";
import { err, isError, ok } from "../result.js";
import type { Result } from "../result.js";
import type {
  DuplicateMargonemAccountError,
  OwnedMargonemAccountSummary,
  OwnedMargonemAccountWriter,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountImportStore,
  SquadBuilderPersistenceUnavailable,
} from "./account-import-store.js";
import type { Clock } from "./preview-margonem-profile-import.js";

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

/** Service module that confirms a pending import into an owned account. */
export class ConfirmOwnedAccountImport {
  private readonly pendingImports: PendingMargonemAccountImportStore;
  private readonly accounts: OwnedMargonemAccountWriter;
  private readonly clock: Clock;

  constructor(
    pendingImports: PendingMargonemAccountImportStore,
    accounts: OwnedMargonemAccountWriter,
    clock: Clock
  ) {
    this.pendingImports = pendingImports;
    this.accounts = accounts;
    this.clock = clock;
  }

  /** Save a previously previewed Margonem account and its Jaruna characters. */
  async confirm(
    input: ConfirmOwnedAccountImportInput
  ): Promise<
    Result<OwnedMargonemAccountSummary, ConfirmOwnedAccountImportError>
  > {
    const displayName = parseAccountDisplayName(input.displayName);

    if (isError(displayName)) {
      return err(displayName.error);
    }

    const now = this.clock.now();
    const pending = await this.pendingImports.findPendingImportForConfirmation({
      actorUserId: input.actorUserId,
      now,
      pendingImportId: input.pendingImportId,
    });

    if (isError(pending)) {
      return err(pending.error);
    }

    const created = await this.accounts.createOwnedAccountFromPendingImport({
      actorUserId: input.actorUserId,
      displayName: displayName.value,
      pending: pending.value,
    });

    if (isError(created)) {
      return err(created.error);
    }

    return ok(created.value);
  }
}
