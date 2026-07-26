import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { BetId, EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  BetByEventSummary,
  BetSummary,
  CreatedBet,
  LatestBetForCopy,
  MutationSuccess,
  PaginatedBets,
  StoredBetMember,
} from "../../protocol/bet/http-api-contract.ts";
import type { BetError } from "./bet-errors.ts";

export type LatestBetForCopyResult = typeof LatestBetForCopy.Type;

export interface CreateBetInput {
  readonly createdAt: Date;
  readonly createdBy: AppUserId;
  readonly heroId: HeroId;
  readonly userIds: readonly AppUserId[];
}

export interface EditBetInput {
  readonly betId: BetId;
  readonly newUserIds: readonly AppUserId[];
}

export interface GetPaginatedBetsInput {
  readonly eventId?: EventId | undefined;
  readonly heroId?: HeroId | undefined;
  readonly limit: number;
  readonly page: number;
}

export interface BetServiceInterface {
  readonly createBet: (input: CreateBetInput) => Effect<CreatedBet, BetError>;
  readonly deleteBet: (id: BetId) => Effect<MutationSuccess, BetError>;
  readonly editBet: (input: EditBetInput) => Effect<MutationSuccess, BetError>;
  readonly getAllBets: () => Effect<readonly BetSummary[], BetError>;
  readonly getPaginatedBets: (
    input: GetPaginatedBetsInput
  ) => Effect<PaginatedBets, BetError>;
  readonly getBetMembers: (
    betId: BetId
  ) => Effect<readonly StoredBetMember[], BetError>;
  readonly getBetsByEvent: (
    eventId: EventId
  ) => Effect<readonly BetByEventSummary[], BetError>;
  readonly getLatestBetForCopy: () => Effect<LatestBetForCopyResult, BetError>;
}

export class BetService extends Context.Service<
  BetService,
  BetServiceInterface
>()("@tepirek-revamped/api/BetService") {}
