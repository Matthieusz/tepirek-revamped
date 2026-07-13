import type { AnnouncementSummary } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import { Effect } from "effect";
import * as Atom from "effect/unstable/reactivity/Atom";

import { updateResultSuccess } from "@/lib/effect-atom-result";
import {
  AppHttpApiClient,
  appHttpApiAtom,
  appHttpApiFn,
} from "@/lib/http-api-client-runtime";

type Announcement = typeof AnnouncementSummary.Type;

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

/** Optimistic announcement resource that preserves loading and failure states. */
export const optimisticAnnouncementsAtom = Atom.optimistic(announcementsAtom);

/** Optimistic mutation atom for deleting an announcement from the list. */
export const deleteAnnouncementAtom = optimisticAnnouncementsAtom.pipe(
  Atom.optimisticFn({
    fn: deleteAnnouncementRequestAtom,
    reducer: (current, input) =>
      updateResultSuccess(current, (announcements) =>
        removeAnnouncementById(announcements, input)
      ),
  })
);
