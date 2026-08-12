import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { VaultError } from "./vault-errors.ts";

interface DistributeGoldSuccess {
  readonly goldAmount: number;
  readonly heroId: HeroId;
  readonly heroName: string;
  readonly pointWorth: number;
  readonly success: boolean;
  readonly totalPoints: number;
  readonly usersUpdated: number;
}
interface VaultRow {
  readonly paidOut: boolean;
  readonly totalEarnings: string;
  readonly userId: AppUserId;
  readonly userImage: string | null;
  readonly userName: string | null;
}
interface MutationSuccess {
  readonly success: boolean;
}

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
  ) => Effect<DistributeGoldSuccess, VaultError>;
  readonly getVault: (
    eventId?: EventId
  ) => Effect<readonly VaultRow[], VaultError>;
  readonly togglePaidOut: (
    input: TogglePaidOutInput
  ) => Effect<MutationSuccess, VaultError>;
}

export class VaultService extends Context.Service<
  VaultService,
  VaultServiceInterface
>()("@tepirek-revamped/api/VaultService") {}
