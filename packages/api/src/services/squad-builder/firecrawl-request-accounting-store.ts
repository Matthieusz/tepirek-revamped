import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { FirecrawlYearMonth } from "../../domain/squad-builder/firecrawl-year-month.ts";
import type { MargonemProfileId } from "../../domain/squad-builder/margonem-profile-id.ts";
import type { FirecrawlCreditCount } from "./firecrawl-config.ts";
import type {
  SquadBuilderPersistenceUnavailable,
  FirecrawlMonthlyBudgetExhausted,
} from "./squad-groups/squad-group-errors.ts";

/** Current state of Firecrawl monthly budget usage. */
interface FirecrawlBudgetState {
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
  readonly usedRequests: number;
  readonly remainingRequests: number;
}

/** Expected failure while reserving Firecrawl request budget. */
export type FirecrawlBudgetError =
  | FirecrawlMonthlyBudgetExhausted
  | SquadBuilderPersistenceUnavailable;

/** Input for reserving one Firecrawl request. */
export interface ReserveFirecrawlRequestInput {
  readonly profileId?: MargonemProfileId;
  readonly requestedByUserId?: AppUserId;
  readonly yearMonth: FirecrawlYearMonth;
  readonly monthlyRequestBudget: number;
}

/** Reserved Firecrawl request row and budget summary. */
interface ReservedFirecrawlRequest {
  readonly requestId: number;
  readonly budgetState: FirecrawlBudgetState;
}

/** Input for marking a reserved Firecrawl request as successful. */
export interface MarkFirecrawlRequestSucceededInput {
  readonly completedAt: Date;
  readonly requestId: number;
  readonly creditsUsed: FirecrawlCreditCount;
  readonly firecrawlStatusCode: number | null;
  readonly cacheState: string | null;
}

/** Input for marking a reserved Firecrawl request as failed. */
export interface MarkFirecrawlRequestFailedInput {
  readonly completedAt: Date;
  readonly requestId: number;
  readonly errorTag: string;
}

/** Persistence operations for transactionally accounting for Firecrawl requests. */
export interface FirecrawlRequestAccountingStoreContract {
  readonly reserveRequest: (
    input: ReserveFirecrawlRequestInput
  ) => Effect<
    ReservedFirecrawlRequest,
    FirecrawlBudgetError | SquadBuilderPersistenceUnavailable
  >;
  readonly markRequestSucceeded: (
    input: MarkFirecrawlRequestSucceededInput
  ) => Effect<void, SquadBuilderPersistenceUnavailable>;
  readonly markRequestFailed: (
    input: MarkFirecrawlRequestFailedInput
  ) => Effect<void, SquadBuilderPersistenceUnavailable>;
}

/** Store seam shared by workflows that account for Firecrawl requests. */
export class FirecrawlRequestAccountingStoreService extends Context.Service<
  FirecrawlRequestAccountingStoreService,
  FirecrawlRequestAccountingStoreContract
>()(
  "@tepirek-revamped/api/squad-builder/FirecrawlRequestAccountingStoreService"
) {}
