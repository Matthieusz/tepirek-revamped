import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type { EventId } from "../../domain/core-identifiers.ts";
import type { ApplicationDependencyUnavailable } from "../application-errors.ts";

export interface CreateEventInput {
  readonly color?: string | undefined;
  readonly endTime: Date;
  readonly icon?: string | undefined;
  readonly name: string;
}
export interface DeleteEventInput {
  readonly id: EventId;
}
export interface ToggleEventActiveInput {
  readonly active: boolean;
  readonly id: EventId;
}
export interface EventSummary {
  readonly active: boolean | null;
  readonly color: string;
  readonly endTime: Date;
  readonly icon: string;
  readonly id: EventId;
  readonly name: string;
}

/** Persistence port for event use cases. */
export class EventStore extends Context.Service<
  EventStore,
  {
    readonly create: (
      input: CreateEventInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly delete: (
      input: DeleteEventInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly list: () => Effect.Effect<
      readonly EventSummary[],
      ApplicationDependencyUnavailable
    >;
    readonly toggleActive: (
      input: ToggleEventActiveInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
  }
>()("@tepirek-revamped/api/EventStore") {}
