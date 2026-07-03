import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeApiLiveLayer } from "../effect-app.js";
import { HeroesStore } from "../modules/heroes/heroes-store.js";
import {
  createAdmin,
  createEvent,
  createVerifiedMember,
} from "../test/integration/builders.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const heroInput = {
  image: "https://example.com/hero.png",
  level: 120,
  name: "Testowy Heros",
} as const;

const runStoreEffect = <A, E>(effect: Effect.Effect<A, E, HeroesStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl))));

describe("heroes HttpApi store Postgres integration", () => {
  it("creates heroes that verified members can read", async () => {
    const event = await createEvent({ name: "Hero Event" });
    await createAdmin({ id: "heroes-admin" });
    await createVerifiedMember({ id: "heroes-member" });

    await runStoreEffect(
      HeroesStore.use((store) =>
        store.create({ ...heroInput, eventId: event.id })
      )
    );

    await expect(
      runStoreEffect(HeroesStore.use((store) => store.list()))
    ).resolves.toMatchObject([
      {
        eventId: event.id,
        image: heroInput.image,
        level: heroInput.level,
        name: heroInput.name,
      },
    ]);
    await expect(
      runStoreEffect(
        HeroesStore.use((store) => store.listByEvent({ eventId: event.id }))
      )
    ).resolves.toMatchObject([{ eventId: event.id, name: heroInput.name }]);
  });

  it("deletes heroes", async () => {
    const event = await createEvent({ name: "Deleted Hero Event" });
    await createAdmin({ id: "heroes-delete-admin" });

    await runStoreEffect(
      HeroesStore.use((store) =>
        store.create({ ...heroInput, eventId: event.id })
      )
    );
    const [createdHero] = await runStoreEffect(
      HeroesStore.use((store) => store.list())
    );

    await runStoreEffect(
      HeroesStore.use((store) => store.delete({ id: createdHero?.id ?? 0 }))
    );

    await expect(
      runStoreEffect(
        HeroesStore.use((store) => store.listByEvent({ eventId: event.id }))
      )
    ).resolves.toEqual([]);
  });
});
