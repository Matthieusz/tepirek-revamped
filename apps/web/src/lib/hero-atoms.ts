import { Atom, Result } from "@effect-atom/atom-react";
import type { HeroSummary } from "@tepirek-revamped/api/protocol/heroes/http-api-contract";
import { Effect } from "effect";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type Hero = typeof HeroSummary.Type;

const emptyHeroes: readonly Hero[] = [];

const getHeroListOrEmpty = (result: Result.Result<readonly Hero[], unknown>) =>
  Result.isSuccess(result) ? result.value : emptyHeroes;

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
      return yield* client.heroes.listHeroesByEvent({ payload: { eventId } });
    })
  )
);

export const heroesByEventAtom = (eventId: number) =>
  heroesByEventIdAtom(eventId);

/** Mutation atom for creating a hero. */
export const createHeroAtom = appHttpApiFn(
  (
    payload: {
      readonly eventId: number;
      readonly image?: string;
      readonly level?: number;
      readonly name: string;
    },
    get
  ) =>
    Effect.gen(function* createHeroEffect() {
      const client = yield* AppHttpApiClient;
      const hero = yield* client.heroes.createHero({ payload });
      get.refresh(heroesAtom);
      return hero;
    })
);

const deleteHeroRequestAtom = appHttpApiFn((payload: { readonly id: number }) =>
  Effect.gen(function* deleteHeroEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.heroes.deleteHero({ payload });
  })
);

/** Optimistic hero list atom backed by the Result-returning heroes resource. */
export const optimisticHeroesAtom = Atom.optimistic(
  heroesAtom.pipe(Atom.map(getHeroListOrEmpty))
);

/** Optimistic mutation atom for deleting a hero from the list. */
export const deleteHeroAtom = optimisticHeroesAtom.pipe(
  Atom.optimisticFn({
    fn: deleteHeroRequestAtom,
    reducer: removeHeroById,
  })
);
