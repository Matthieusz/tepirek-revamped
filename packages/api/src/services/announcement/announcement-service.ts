import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import { AnnouncementStore } from "./announcement-store.ts";

/** Create an announcement on behalf of an administrator. */
export const createAnnouncement = Effect.fn("Announcement.create")(
  function* createAnnouncement(input: {
    readonly description: string;
    readonly title: string;
    readonly userId: Parameters<
      (typeof AnnouncementStore.Service)["create"]
    >[0]["userId"];
  }) {
    const store = yield* AnnouncementStore;
    yield* store.create({
      createdAt: yield* DateTime.nowAsDate,
      description: input.description,
      title: input.title,
      userId: input.userId,
    });
  }
);

/** Delete an announcement. */
export const deleteAnnouncement = Effect.fn("Announcement.delete")(
  function* deleteAnnouncement(
    input: Parameters<(typeof AnnouncementStore.Service)["delete"]>[0]
  ) {
    const store = yield* AnnouncementStore;
    yield* store.delete(input);
  }
);

/** List announcements visible to verified users. */
export const listAnnouncements = Effect.fn("Announcement.list")(
  function* listAnnouncements() {
    const store = yield* AnnouncementStore;
    return yield* store.list();
  }
);
