import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { BetId, EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { BetError } from "./bet-errors.ts";

export interface BetMemberSummary {
  readonly heroBetId: BetId;
  readonly points: string;
  readonly userId: AppUserId;
  readonly userImage: string | null;
  readonly userName: string | null;
}
export interface BetSummary {
  readonly createdAt: Date;
  readonly createdBy: AppUserId;
  readonly createdByImage: string | null;
  readonly createdByName: string | null;
  readonly eventId: EventId;
  readonly heroId: HeroId;
  readonly heroImage: string | null;
  readonly heroLevel?: number;
  readonly heroName: string;
  readonly id: BetId;
  readonly memberCount: number;
  readonly members: BetMemberSummary[];
}
export interface BetByEventSummary {
  readonly createdAt: Date;
  readonly createdBy: AppUserId;
  readonly eventId: EventId;
  readonly heroId: HeroId;
  readonly heroName: string;
  readonly id: BetId;
  readonly memberCount: number;
}
export interface StoredBetMember {
  readonly id: number;
  readonly points: string;
  readonly userId: AppUserId;
}
export interface CreatedBet {
  readonly createdAt: Date;
  readonly createdBy: AppUserId;
  readonly heroId: HeroId;
  readonly id: BetId;
  readonly memberCount: number;
}
export interface LatestBetForCopy {
  readonly id: BetId;
  readonly members: readonly BetMemberSummary[];
}
export interface PaginatedBets {
  readonly items: BetSummary[];
  readonly pagination: {
    readonly hasMore: boolean;
    readonly limit: number;
    readonly page: number;
    readonly totalItems: number;
    readonly totalPages: number;
  };
}
export interface MutationSuccess {
  readonly success: boolean;
}

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
  readonly getLatestBetForCopy: () => Effect<LatestBetForCopy | null, BetError>;
}

export class BetService extends Context.Service<
  BetService,
  BetServiceInterface
>()("@tepirek-revamped/api/BetService") {}
