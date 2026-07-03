import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeApiLiveLayer } from "../effect-app.js";
import { EventStore } from "../modules/event/event-store.js";
import {
  createAdmin,
  createVerifiedMember,
} from "../test/integration/builders.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const eventInput = {
  color: "#22c55e",
  endTime: new Date("2030-01-02T03:04:05.000Z"),
  icon: "calendar",
  name: "Guild Boss Hunt",
} as const;

const runStoreEffect = <A, E>(effect: Effect.Effect<A, E, EventStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl))));

describe("event HttpApi store Postgres integration", () => {
  it("creates events that verified members can read", async () => {
    await createAdmin({ id: "event-admin" });
    await createVerifiedMember({ id: "event-member" });

    await runStoreEffect(EventStore.use((store) => store.create(eventInput)));

    await expect(
      runStoreEffect(EventStore.use((store) => store.list()))
    ).resolves.toMatchObject([
      {
        active: true,
        color: "#22c55e",
        icon: "calendar",
        name: "Guild Boss Hunt",
      },
    ]);
  });

  it("toggles event activity", async () => {
    await createAdmin({ id: "event-toggle-admin" });
    await createVerifiedMember({ id: "event-toggle-member" });

    await runStoreEffect(
      EventStore.use((store) =>
        store.create({ ...eventInput, name: "Toggle Event Activity" })
      )
    );
    const [createdEvent] = await runStoreEffect(
      EventStore.use((store) => store.list())
    );
    if (!createdEvent) {
      throw new Error("expected created event to exist");
    }

    await runStoreEffect(
      EventStore.use((store) =>
        store.toggleActive({ active: false, id: createdEvent.id })
      )
    );
    await expect(
      runStoreEffect(EventStore.use((store) => store.list()))
    ).resolves.toEqual([
      expect.objectContaining({ active: false, id: createdEvent.id }),
    ]);

    await runStoreEffect(
      EventStore.use((store) =>
        store.toggleActive({ active: true, id: createdEvent.id })
      )
    );
    await expect(
      runStoreEffect(EventStore.use((store) => store.list()))
    ).resolves.toEqual([
      expect.objectContaining({ active: true, id: createdEvent.id }),
    ]);
  });
});
