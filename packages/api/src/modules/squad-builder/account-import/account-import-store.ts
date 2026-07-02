import type {
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  DuplicateMargonemAccountError,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  FirecrawlBudgetError,
  FirecrawlBudgetState,
  FirecrawlRequestLedger,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  OwnedMargonemAccountReader,
  OwnedMargonemAccountSummary,
  OwnedMargonemAccountWriter,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountImportStore,
  ProfileAccessState,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SquadBuilderAccountLookup,
  SquadBuilderPersistenceUnavailable,
} from "../squad-builder-store";

/** Account import persistence contracts used by profile preview and confirmation services. */
export type AccountImportStore = SquadBuilderAccountLookup &
  FirecrawlRequestLedger &
  PendingMargonemAccountImportStore &
  OwnedMargonemAccountWriter &
  OwnedMargonemAccountReader;

export type {
  CreateOwnedAccountFromPendingImportInput,
  CreatePendingMargonemAccountImportInput,
  DuplicateMargonemAccountError,
  FindPendingMargonemAccountImportInput,
  FindProfileAccessStateInput,
  FirecrawlBudgetError,
  FirecrawlBudgetState,
  FirecrawlRequestLedger,
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  OwnedMargonemAccountReader,
  OwnedMargonemAccountSummary,
  OwnedMargonemAccountWriter,
  PendingMargonemAccountImport,
  PendingMargonemAccountImportForConfirmation,
  PendingMargonemAccountImportNotFound,
  PendingMargonemAccountImportStore,
  ProfileAccessState,
  ReserveFirecrawlRequestInput,
  ReservedFirecrawlRequest,
  SquadBuilderAccountLookup,
  SquadBuilderPersistenceUnavailable,
};
