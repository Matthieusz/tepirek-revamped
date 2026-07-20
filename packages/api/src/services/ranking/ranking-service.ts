import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  HeroStats,
  RankingResult,
} from "../../protocol/ranking/http-api-contract.ts";
import type { RankingError } from "./ranking-errors.ts";

export type HeroStatsResult = HeroStats;
export type RankingResultType = RankingResult;

export interface GetRankingInput {
  readonly eventId?: EventId | undefined;
  readonly heroId?: HeroId | undefined;
}

export interface RankingRow {
  readonly totalBets: number;
  readonly totalEarnings: string;
  readonly totalPoints: string;
  readonly userId: AppUserId;
  readonly userImage: string | null;
  readonly userName: string | null;
}

export interface RankingServiceInterface {
  readonly getHeroStats: (
    heroId: HeroId
  ) => Effect<HeroStatsResult, RankingError>;
  readonly getOldestUnpaidEvent: () => Effect<EventId | null, RankingError>;
  readonly getRanking: (
    input: GetRankingInput
  ) => Effect<RankingResultType, RankingError>;
}

export class RankingService extends Context.Service<
  RankingService,
  RankingServiceInterface
>()("@tepirek-revamped/api/RankingService") {}
