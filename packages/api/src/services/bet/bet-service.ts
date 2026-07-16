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

export type CreatedBetResult = typeof CreatedBet.Type;
export type BetSummaryResult = typeof BetSummary.Type;
export type BetByEventSummaryResult = typeof BetByEventSummary.Type;
export type StoredBetMemberResult = typeof StoredBetMember.Type;
export type LatestBetForCopyResult = typeof LatestBetForCopy.Type;
export type PaginatedBetsResult = typeof PaginatedBets.Type;
export type MutationSuccessResult = typeof MutationSuccess.Type;

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
  readonly createBet: (
    input: CreateBetInput
  ) => Effect<CreatedBetResult, BetError>;
  readonly deleteBet: (id: BetId) => Effect<MutationSuccessResult, BetError>;
  readonly editBet: (
    input: EditBetInput
  ) => Effect<MutationSuccessResult, BetError>;
  readonly getAllBets: () => Effect<readonly BetSummaryResult[], BetError>;
  readonly getPaginatedBets: (
    input: GetPaginatedBetsInput
  ) => Effect<PaginatedBetsResult, BetError>;
  readonly getBetMembers: (
    betId: BetId
  ) => Effect<readonly StoredBetMemberResult[], BetError>;
  readonly getBetsByEvent: (
    eventId: EventId
  ) => Effect<readonly BetByEventSummaryResult[], BetError>;
  readonly getLatestBetForCopy: () => Effect<LatestBetForCopyResult, BetError>;
}

export class BetService extends Context.Service<
  BetService,
  BetServiceInterface
>()("@tepirek-revamped/api/BetService") {}
