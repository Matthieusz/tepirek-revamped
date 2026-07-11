import type { AnnouncementSummary } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import { Effect } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as Atom from "effect/unstable/reactivity/Atom";

import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type Announcement = typeof AnnouncementSummary.Type;

const emptyAnnouncements: readonly Announcement[] = [];

const getAnnouncementListOrEmpty = (
  result: AsyncResult.AsyncResult<readonly Announcement[], unknown>
) => (AsyncResult.isSuccess(result) ? result.value : emptyAnnouncements);

const removeAnnouncementById = (
  announcements: readonly Announcement[],
  input: { readonly id: number }
) => announcements.filter((announcement) => announcement.id !== input.id);

/** Resource atom for announcements. */
export const announcementsAtom = appHttpApiAtom(
  Effect.gen(function* listAnnouncementsEffect() {
    const client = yield* AppHttpApiClient;
    return yield* client.announcement.listAnnouncements({});
  })
);

/** Mutation atom for creating an announcement. */
export const createAnnouncementAtom = appHttpApiFn(
  (payload: { readonly description: string; readonly title: string }, get) =>
    Effect.gen(function* createAnnouncementEffect() {
      const client = yield* AppHttpApiClient;
      const announcement = yield* client.announcement.createAnnouncement({
        payload,
      });
      get.refresh(announcementsAtom);
      return announcement;
    })
);

const deleteAnnouncementRequestAtom = appHttpApiFn(
  (payload: { readonly id: number }) =>
    Effect.gen(function* deleteAnnouncementEffect() {
      const client = yield* AppHttpApiClient;
      return yield* client.announcement.deleteAnnouncement({ payload });
    })
);

/** Optimistic announcement list atom backed by the Result-returning resource. */
export const optimisticAnnouncementsAtom = Atom.optimistic(
  announcementsAtom.pipe(Atom.map(getAnnouncementListOrEmpty))
);

/** Optimistic mutation atom for deleting an announcement from the list. */
export const deleteAnnouncementAtom = optimisticAnnouncementsAtom.pipe(
  Atom.optimisticFn({
    fn: deleteAnnouncementRequestAtom,
    reducer: removeAnnouncementById,
  })
);
