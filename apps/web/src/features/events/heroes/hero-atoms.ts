import type { HeroSummary } from "@tepirek-revamped/api/protocol/heroes/http-api-contract";
import { Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import { asEventId, asHeroId } from "@/lib/branded-ids";
import { updateResultSuccess } from "@/lib/effect-atom-result";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type Hero = HeroSummary;

const removeHeroById = (
  heroes: readonly Hero[],
  input: { readonly id: number }
) => heroes.filter((hero) => hero.id !== input.id);

/** Resource atom for all heroes. */
export const heroesAtom = appHttpApiAtom(
  Effect.gen(function* listHeroesEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.heroes.listHeroes({});
  })
);

/** Resource atom for heroes in one event. */
const heroesByEventIdAtom = Atom.family((eventId: number) =>
  appHttpApiAtom(
    Effect.gen(function* listHeroesByEventEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.heroes.listHeroesByEvent({
        payload: { eventId: yield* asEventId(eventId) },
      });
    })
  )
);

const disabledHeroesByEventAtom = Atom.make(
  AsyncResult.success([] as readonly Hero[])
);

export const heroesByEventAtom = (eventId: number | null) =>
  eventId === null || eventId <= 0
    ? disabledHeroesByEventAtom
    : heroesByEventIdAtom(eventId);

/** Mutation atom for creating a hero. */
export const createHeroAtom = appHttpApiFn(
  Effect.fn("Web.Hero.create")(function* createHeroEffect(
    payload: {
      readonly eventId: number;
      readonly image?: string;
      readonly level?: number;
      readonly name: string;
    },
    get: Atom.FnContext
  ) {
    const client = yield* AppHttpApiClient;
    const hero = yield* client.heroes.createHero({
      payload: { ...payload, eventId: yield* asEventId(payload.eventId) },
    });
    get.refresh(heroesAtom);
    return hero;
  })
);

const deleteHeroRequestAtom = appHttpApiFn(
  Effect.fn("Web.Hero.delete")(function* deleteHeroEffect(input: {
    readonly id: number;
  }) {
    const client = yield* AppHttpApiClient;
    return yield* client.heroes.deleteHero({
      payload: { id: yield* asHeroId(input.id) },
    });
  })
);

/** Optimistic hero resource that preserves loading and failure states. */
export const optimisticHeroesAtom = Atom.optimistic(heroesAtom);

/** Optimistic mutation atom for deleting a hero from the list. */
export const deleteHeroAtom = optimisticHeroesAtom.pipe(
  Atom.optimisticFn({
    fn: deleteHeroRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (heroes) => removeHeroById(heroes, input)),
  })
);
