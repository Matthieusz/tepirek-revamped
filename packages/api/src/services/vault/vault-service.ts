import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { UserStatsRow } from "../../protocol/vault/http-api-contract.ts";
import type { VaultError } from "./vault-errors.ts";

export type UserStatsResultRow = typeof UserStatsRow.Type;

export interface DistributeGoldInput {
  readonly goldAmount: number;
  readonly heroId: number;
}

export interface TogglePaidOutInput {
  readonly eventId: number;
  readonly paidOut: boolean;
  readonly userId: string;
}

export interface VaultServiceInterface {
  readonly distributeGold: (input: DistributeGoldInput) => Effect<
    {
      readonly goldAmount: number;
      readonly heroId: number;
      readonly heroName: string;
      readonly pointWorth: number;
      readonly success: true;
      readonly totalPoints: number;
      readonly usersUpdated: number;
    },
    VaultError
  >;
  readonly getUserStats: (
    eventId?: number
  ) => Effect<readonly UserStatsResultRow[], VaultError>;
  readonly getVault: (eventId?: number) => Effect<
    readonly {
      readonly paidOut: boolean;
      readonly totalEarnings: string;
      readonly userId: string;
      readonly userImage: string | null;
      readonly userName: string | null;
    }[],
    VaultError
  >;
  readonly togglePaidOut: (
    input: TogglePaidOutInput
  ) => Effect<{ readonly success: true }, VaultError>;
}

export class VaultService extends Context.Service<
  VaultService,
  VaultServiceInterface
>()("@tepirek-revamped/api/VaultService") {}
