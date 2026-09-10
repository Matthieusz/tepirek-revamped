import type { HeroSummary } from "@tepirek-revamped/api/protocol/heroes/http-api-contract";
import { Effect } from "effect";

import { asEventId, asHeroId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Hero data returned by the application API. */
export type Hero = HeroSummary;

/** Input for creating a hero from browser form data. */
export interface CreateHeroInput {
  readonly eventId: number;
  readonly image?: string;
  readonly level?: number;
  readonly name: string;
}

/** Input for deleting a hero. */
export interface DeleteHeroInput {
  readonly id: number;
}

/** Lists all heroes. */
export const listHeroes = Effect.fn("Web.Hero.list")(
  function* listHeroesEffect() {
    const client = yield* AppHttpApiClient;

    return yield* client.heroes.listHeroes({});
  }
);

/** Lists heroes assigned to one event. */
export const listHeroesByEvent = Effect.fn("Web.Hero.listByEvent")(
  function* listHeroesByEventEffect(eventId: number) {
    const client = yield* AppHttpApiClient;

    return yield* client.heroes.listHeroesByEvent({
      payload: { eventId: yield* asEventId(eventId) },
    });
  }
);

/** Creates a hero for the authenticated administrator. */
export const createHero = Effect.fn("Web.Hero.create")(
  function* createHeroEffect(payload: CreateHeroInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.heroes.createHero({
      payload: {
        ...payload,
        eventId: yield* asEventId(payload.eventId),
      },
    });
  }
);

/** Deletes a hero after decoding its browser-provided ID. */
export const deleteHero = Effect.fn("Web.Hero.delete")(
  function* deleteHeroEffect(input: DeleteHeroInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.heroes.deleteHero({
      payload: { id: yield* asHeroId(input.id) },
    });
  }
);

/** Promise runner type used by hero query and mutation adapters. */
export type HeroApiRunner = typeof runAppHttpApi;
