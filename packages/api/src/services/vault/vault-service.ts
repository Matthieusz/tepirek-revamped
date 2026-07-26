import * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

import type { EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  DistributeGoldSuccess,
  MutationSuccess,
  VaultRow,
} from "../../protocol/vault/http-api-contract.ts";
import type { VaultError } from "./vault-errors.ts";

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
