import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type { AnnouncementId } from "../../domain/core-identifiers.ts";
import type { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type { ApplicationDependencyUnavailable } from "../application-errors.ts";

export interface AnnouncementSummary {
  readonly createdAt: Date;
  readonly description: string;
  readonly id: AnnouncementId;
  readonly title: string;
  readonly user: {
    readonly id: AppUserId;
    readonly image: string | null;
    readonly name: string | null;
  } | null;
}

export interface CreateAnnouncementInput {
  readonly createdAt: Date;
  readonly description: string;
  readonly title: string;
  readonly userId: AppUserId;
}

export interface DeleteAnnouncementInput {
  readonly id: AnnouncementId;
}

/** Persistence port for announcement use cases. */
export class AnnouncementStore extends Context.Service<
  AnnouncementStore,
  {
    readonly create: (
      input: CreateAnnouncementInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly delete: (
      input: DeleteAnnouncementInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly list: () => Effect.Effect<
      readonly AnnouncementSummary[],
      ApplicationDependencyUnavailable
    >;
  }
>()("@tepirek-revamped/api/AnnouncementStore") {}
