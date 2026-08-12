import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { RankingError } from "./ranking-errors.ts";

export interface HeroStats {
  readonly currentPointWorth: number;
  readonly heroId: HeroId;
  readonly heroName: string;
  readonly totalBets: number;
  readonly totalPoints: number;
}

export interface RankingResult {
  readonly pointWorth: number | null;
  readonly ranking: readonly RankingRow[];
  readonly totalBets: number;
}

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
  readonly getHeroStats: (heroId: HeroId) => Effect<HeroStats, RankingError>;
  readonly getOldestUnpaidEvent: () => Effect<EventId | null, RankingError>;
  readonly getRanking: (
    input: GetRankingInput
  ) => Effect<RankingResult, RankingError>;
}

export class RankingService extends Context.Service<
  RankingService,
  RankingServiceInterface
>()("@tepirek-revamped/api/RankingService") {}
