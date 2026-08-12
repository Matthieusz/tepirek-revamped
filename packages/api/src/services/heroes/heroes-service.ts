import * as Effect from "effect/Effect";

import { HeroesStore } from "./heroes-store.ts";

export const createHero = Effect.fn("Heroes.create")(function* createHero(
  input: Parameters<(typeof HeroesStore.Service)["create"]>[0]
) {
  const store = yield* HeroesStore;
  yield* store.create(input);
});

export const deleteHero = Effect.fn("Heroes.delete")(function* deleteHero(
  input: Parameters<(typeof HeroesStore.Service)["delete"]>[0]
) {
  const store = yield* HeroesStore;
  yield* store.delete(input);
});

export const listHeroes = Effect.fn("Heroes.list")(function* listHeroes() {
  const store = yield* HeroesStore;
  return yield* store.list();
});

export const listHeroesByEvent = Effect.fn("Heroes.listByEvent")(
  function* listHeroesByEvent(
    input: Parameters<(typeof HeroesStore.Service)["listByEvent"]>[0]
  ) {
    const store = yield* HeroesStore;
    return yield* store.listByEvent(input);
  }
);
