import type { AppUserId } from "./app-user-id";
import { err, isError, ok } from "./result";
import type { Result } from "./result";
import type {
  OwnedMargonemAccountReader,
  OwnedMargonemAccountSummary,
  SquadBuilderPersistenceUnavailable,
} from "./squad-builder-store";

/** Input for listing owned Margonem accounts. */
export interface ListOwnedMargonemAccountsInput {
  readonly actorUserId: AppUserId;
}

/** Expected failures returned by the list owned accounts service. */
export type ListOwnedMargonemAccountsError = SquadBuilderPersistenceUnavailable;

/** Service module that lists Margonem accounts owned by the actor. */
export class ListOwnedMargonemAccounts {
  private readonly accounts: OwnedMargonemAccountReader;

  constructor(accounts: OwnedMargonemAccountReader) {
    this.accounts = accounts;
  }

  /** List Margonem accounts owned by the actor. */
  async list(
    input: ListOwnedMargonemAccountsInput
  ): Promise<
    Result<
      readonly OwnedMargonemAccountSummary[],
      ListOwnedMargonemAccountsError
    >
  > {
    const result = await this.accounts.listOwnedAccounts({
      actorUserId: input.actorUserId,
    });

    if (isError(result)) {
      return err(result.error);
    }

    return ok(result.value);
  }
}
