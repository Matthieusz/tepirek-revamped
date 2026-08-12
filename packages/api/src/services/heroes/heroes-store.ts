import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

import type { EventId, HeroId } from "../../domain/core-identifiers.ts";
import type { ApplicationDependencyUnavailable } from "../application-errors.ts";

export interface CreateHeroInput {
  readonly eventId: EventId;
  readonly image?: string | undefined;
  readonly level?: number | undefined;
  readonly name: string;
}
export interface DeleteHeroInput {
  readonly id: HeroId;
}
export interface ListHeroesByEventInput {
  readonly eventId: EventId;
}
export interface HeroSummary {
  readonly eventId: EventId;
  readonly id: HeroId;
  readonly image: string | null;
  readonly level: number;
  readonly name: string;
  readonly pointWorth: string;
}

/** Persistence port for hero use cases. */
export class HeroesStore extends Context.Service<
  HeroesStore,
  {
    readonly create: (
      input: CreateHeroInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly delete: (
      input: DeleteHeroInput
    ) => Effect.Effect<void, ApplicationDependencyUnavailable>;
    readonly list: () => Effect.Effect<
      readonly HeroSummary[],
      ApplicationDependencyUnavailable
    >;
    readonly listByEvent: (
      input: ListHeroesByEventInput
    ) => Effect.Effect<
      readonly HeroSummary[],
      ApplicationDependencyUnavailable
    >;
  }
>()("@tepirek-revamped/api/HeroesStore") {}
