import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { makeApiLiveLayer } from "../effect-app.js";
import { AnnouncementStore } from "../modules/announcement/announcement-store.js";
import {
  createAdmin,
  createVerifiedMember,
} from "../test/integration/builders.js";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const announcementInput = {
  description: "Zbiórka pod aukcje zaczyna się o 20:00",
  title: "Ważna informacja gildyjna",
} as const;

const runStoreEffect = <A, E>(effect: Effect.Effect<A, E, AnnouncementStore>) =>
  Effect.runPromise(effect.pipe(Effect.provide(makeApiLiveLayer(databaseUrl))));

describe("announcement HttpApi store Postgres integration", () => {
  it("creates announcements that verified members can read", async () => {
    const admin = await createAdmin({
      id: "announcement-admin",
      image: "https://example.com/admin.png",
      name: "Announcement Admin",
    });
    await createVerifiedMember({ id: "announcement-member" });

    await runStoreEffect(
      AnnouncementStore.use((store) =>
        store.create({ ...announcementInput, userId: admin.id })
      )
    );

    await expect(
      runStoreEffect(AnnouncementStore.use((store) => store.list()))
    ).resolves.toMatchObject([
      {
        description: announcementInput.description,
        title: announcementInput.title,
        user: {
          id: admin.id,
          image: "https://example.com/admin.png",
          name: "Announcement Admin",
        },
      },
    ]);
  });

  it("deletes announcements", async () => {
    const admin = await createAdmin({ id: "announcement-delete-admin" });

    await runStoreEffect(
      AnnouncementStore.use((store) =>
        store.create({ ...announcementInput, userId: admin.id })
      )
    );
    const [createdAnnouncement] = await runStoreEffect(
      AnnouncementStore.use((store) => store.list())
    );

    await runStoreEffect(
      AnnouncementStore.use((store) =>
        store.delete({ id: createdAnnouncement?.id ?? 0 })
      )
    );

    await expect(
      runStoreEffect(AnnouncementStore.use((store) => store.list()))
    ).resolves.toEqual([]);
  });
});
