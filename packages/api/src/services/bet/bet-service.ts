/* eslint-disable typescript/no-explicit-any -- Simplified service port types for broad Drizzle return shapes. */
import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { BetError } from "./bet-errors.js";

export interface CreateBetInput {
  readonly createdBy: string;
  readonly heroId: number;
  readonly userIds: readonly string[];
}

export interface EditBetInput {
  readonly betId: number;
  readonly newUserIds: readonly string[];
}

export interface GetPaginatedBetsInput {
  readonly eventId?: number | undefined;
  readonly heroId?: number | undefined;
  readonly limit: number;
  readonly page: number;
}

export interface BetServiceInterface {
  readonly createBet: (input: CreateBetInput) => Effect<
    {
      readonly createdAt: Date;
      readonly createdBy: string;
      readonly heroId: number;
      readonly id: number;
      readonly memberCount: number;
    },
    BetError
  >;
  readonly deleteBet: (
    id: number
  ) => Effect<{ readonly success: boolean }, BetError>;
  readonly editBet: (
    input: EditBetInput
  ) => Effect<{ readonly success: boolean }, BetError>;
  readonly getAllBets: () => Effect<
    readonly {
      readonly createdAt: Date;
      readonly createdBy: string;
      readonly createdByImage: string | null;
      readonly createdByName: string | null;
      readonly eventId: number;
      readonly heroId: number;
      readonly heroImage: string | null;
      readonly heroName: string;
      readonly id: number;
      readonly memberCount: number;
      readonly members: readonly {
        readonly heroBetId: number;
        readonly points: string;
        readonly userId: string;
        readonly userImage: string | null;
        readonly userName: string | null;
      }[];
    }[],
    BetError
  >;
  readonly getPaginatedBets: (
    input: GetPaginatedBetsInput
  ) => Effect<any, BetError>;
  readonly getBetMembers: (betId: number) => Effect<
    readonly {
      readonly id: number;
      readonly points: string;
      readonly userId: string;
    }[],
    BetError
  >;
  readonly getBetsByEvent: (eventId: number) => Effect<
    readonly {
      readonly createdAt: Date;
      readonly createdBy: string;
      readonly eventId: number;
      readonly heroId: number;
      readonly heroName: string;
      readonly id: number;
      readonly memberCount: number;
    }[],
    BetError
  >;
  readonly getLatestBetForCopy: () => Effect<any, BetError>;
}

export class BetService extends Context.Service<
  BetService,
  BetServiceInterface
>()("@tepirek-revamped/api/BetService") {}
