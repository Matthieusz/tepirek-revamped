/* eslint-disable typescript/no-explicit-any -- Simplified service port types for broad Drizzle return shapes. */
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { RankingError } from "./ranking-errors.js";

export interface GetRankingInput {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
}

export interface RankingRow {
  readonly totalBets: number;
  readonly totalEarnings: string;
  readonly totalPoints: string;
  readonly userId: string;
  readonly userImage: string | null;
  readonly userName: string | null;
}

export interface RankingResult {
  readonly pointWorth: number | null;
  readonly ranking: readonly RankingRow[];
  readonly totalBets: number;
}

export interface RankingServiceInterface {
  readonly getHeroStats: (heroId: number) => Effect<
    {
      readonly currentPointWorth: number;
      readonly heroId: number;
      readonly heroName: string;
      readonly totalBets: number;
      readonly totalPoints: number;
    },
    RankingError
  >;
  readonly getOldestUnpaidEvent: () => Effect<number | null, RankingError>;
  readonly getRanking: (
    input: GetRankingInput
  ) => Effect<RankingResult, RankingError>;
}

export class RankingService extends Context.Service<
  RankingService,
  RankingServiceInterface
>()("@tepirek-revamped/api/RankingService") {}
