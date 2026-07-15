import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  DistributeGoldSuccess,
  MutationSuccess,
  UserStatsRow,
  VaultRow,
} from "../../protocol/vault/http-api-contract.ts";
import type { VaultError } from "./vault-errors.ts";

export type DistributeGoldResult = typeof DistributeGoldSuccess.Type;
export type UserStatsResultRow = typeof UserStatsRow.Type;
export type VaultResultRow = typeof VaultRow.Type;
export type MutationSuccessResult = typeof MutationSuccess.Type;

export interface DistributeGoldInput {
  readonly goldAmount: number;
  readonly heroId: HeroId;
}

export interface TogglePaidOutInput {
  readonly eventId: EventId;
  readonly paidOut: boolean;
  readonly userId: AppUserId;
}

export interface VaultServiceInterface {
  readonly distributeGold: (
    input: DistributeGoldInput
  ) => Effect<DistributeGoldResult, VaultError>;
  readonly getUserStats: (
    eventId?: EventId
  ) => Effect<readonly UserStatsResultRow[], VaultError>;
  readonly getVault: (
    eventId?: EventId
  ) => Effect<readonly VaultResultRow[], VaultError>;
  readonly togglePaidOut: (
    input: TogglePaidOutInput
  ) => Effect<MutationSuccessResult, VaultError>;
}

export class VaultService extends Context.Service<
  VaultService,
  VaultServiceInterface
>()("@tepirek-revamped/api/VaultService") {}
