import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type { AuctionSignupId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationForbidden,
  ApplicationNotFound,
} from "../application-errors.ts";

export interface AuctionGroupInput {
  readonly profession: string;
  readonly type: string;
}
export interface RemoveSignupInput {
  readonly actorUserId: AppUserId;
  readonly id: AuctionSignupId;
}
export interface ToggleSignupInput {
  readonly actorUserId: AppUserId;
  readonly column: number;
  readonly level: number;
  readonly profession: string;
  readonly round: number;
  readonly type: string;
}
export interface AuctionSignupSummary {
  readonly column: number;
  readonly createdAt: Date;
  readonly id: AuctionSignupId;
  readonly level: number;
  readonly round: number;
  readonly userId: AppUserId;
  readonly userImage: string | null;
  readonly userName: string | null;
}

/** Persistence port for auction use cases. */
export class AuctionStore extends Context.Service<
  AuctionStore,
  {
    readonly getSignups: (
      input: AuctionGroupInput
    ) => Effect.Effect<
      readonly AuctionSignupSummary[],
      ApplicationDependencyUnavailable
    >;
    readonly getStats: (
      input: AuctionGroupInput
    ) => Effect.Effect<
      { readonly totalSignups: number; readonly uniqueUsers: number },
      ApplicationDependencyUnavailable
    >;
    readonly removeSignup: (
      input: RemoveSignupInput
    ) => Effect.Effect<
      { readonly success: true },
      | ApplicationForbidden
      | ApplicationNotFound
      | ApplicationDependencyUnavailable
    >;
    readonly toggleSignup: (
      input: ToggleSignupInput
    ) => Effect.Effect<
      { readonly action: "added" | "removed" },
      ApplicationConflict | ApplicationDependencyUnavailable
    >;
  }
>()("@tepirek-revamped/api/AuctionStore") {}
