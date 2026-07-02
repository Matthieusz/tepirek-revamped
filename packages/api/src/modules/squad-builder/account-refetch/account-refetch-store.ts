import type {
  ApplyRefetchedAccountInput,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  PendingMargonemAccountRefetchNotFound,
  PendingMargonemAccountRefetchStore,
  RefetchableMargonemAccount,
  RefetchableMargonemAccountReader,
  RefetchedMargonemAccountWriter,
  CreatePendingMargonemAccountRefetchInput,
  FindPendingMargonemAccountRefetchInput,
  MarkPendingMargonemAccountRefetchAppliedInput,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
  ActorDoesNotOwnMargonemAccount,
  FirecrawlBudgetError,
  FirecrawlRequestLedger,
  SquadBuilderPersistenceUnavailable,
} from "../squad-builder-store.js";

/** Account refetch persistence contracts used by preview and apply services. */
export type AccountRefetchStore = RefetchableMargonemAccountReader &
  PendingMargonemAccountRefetchStore &
  RefetchedMargonemAccountWriter;

export type {
  ActorDoesNotOwnMargonemAccount,
  ApplyRefetchedAccountInput,
  CreatePendingMargonemAccountRefetchInput,
  FindPendingMargonemAccountRefetchInput,
  FirecrawlBudgetError,
  FirecrawlRequestLedger,
  MargonemAccountNotFound,
  MargonemAccountOwnerAuthorizer,
  MarkPendingMargonemAccountRefetchAppliedInput,
  PendingMargonemAccountRefetch,
  PendingMargonemAccountRefetchForApply,
  PendingMargonemAccountRefetchNotFound,
  PendingMargonemAccountRefetchStore,
  RefetchableMargonemAccount,
  RefetchableMargonemAccountReader,
  RefetchedMargonemAccountWriter,
  SquadBuilderPersistenceUnavailable,
};
