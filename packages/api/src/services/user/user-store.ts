import type { USER_ROLES } from "@tepirek-revamped/config";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";

import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  ApplicationDependencyUnavailable,
  ApplicationForbidden,
  ApplicationInvalidInput,
  ApplicationNotFound,
} from "../application-errors.ts";

export type UserRole = (typeof USER_ROLES)[number];

export interface VerifiedMember {
  readonly id: AppUserId;
  readonly image: string | null;
  readonly name: string;
}
export interface Player {
  readonly createdAt: Date;
  readonly id: AppUserId;
  readonly image: string | null;
  readonly name: string;
  readonly role: string | null;
  readonly updatedAt: Date;
  readonly verified: boolean;
}
export interface SetUserRoleInput {
  readonly actorId: AppUserId;
  readonly role: UserRole;
  readonly updatedAt: Date;
  readonly userId: AppUserId;
}
export interface SetUserVerifiedInput {
  readonly actorId: AppUserId;
  readonly updatedAt: Date;
  readonly userId: AppUserId;
  readonly verified: boolean;
}
export interface UpdateUserNameInput {
  readonly name: string;
  readonly updatedAt: Date;
  readonly userId: AppUserId;
}

type DependencyFailure = ApplicationDependencyUnavailable;

/** Persistence port for user use cases. */
export class UserStore extends Context.Service<
  UserStore,
  {
    readonly deleteUser: (
      userId: AppUserId
    ) => Effect.Effect<
      { readonly success: true },
      ApplicationInvalidInput | ApplicationNotFound | DependencyFailure
    >;
    readonly getDiscordAccessToken: (
      userId: AppUserId
    ) => Effect.Effect<
      Redacted.Redacted,
      ApplicationInvalidInput | DependencyFailure
    >;
    readonly getVerified: () => Effect.Effect<
      readonly VerifiedMember[],
      DependencyFailure
    >;
    readonly list: () => Effect.Effect<readonly Player[], DependencyFailure>;
    readonly markUserVerified: (input: {
      readonly updatedAt: Date;
      readonly userId: AppUserId;
    }) => Effect.Effect<void, DependencyFailure>;
    readonly setRole: (
      input: SetUserRoleInput
    ) => Effect.Effect<
      Player | null,
      ApplicationForbidden | ApplicationNotFound | DependencyFailure
    >;
    readonly setVerified: (
      input: SetUserVerifiedInput
    ) => Effect.Effect<
      Player | null,
      ApplicationForbidden | ApplicationNotFound | DependencyFailure
    >;
    readonly updateProfile: (
      input: UpdateUserNameInput
    ) => Effect.Effect<Player | null, DependencyFailure>;
  }
>()("@tepirek-revamped/api/UserStore") {}
