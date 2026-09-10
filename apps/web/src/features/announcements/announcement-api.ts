import type {
  AnnouncementSummary,
  CreateAnnouncementPayload,
} from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import { Effect } from "effect";

import { asAnnouncementId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Input for deleting one announcement. */
export interface DeleteAnnouncementInput {
  readonly id: number;
}

/** Announcement data returned by the application API. */
export type Announcement = AnnouncementSummary;

/** Lists announcements visible to the authenticated user. */
export const listAnnouncements = Effect.fn("Web.Announcement.list")(
  function* listAnnouncementsEffect() {
    const client = yield* AppHttpApiClient;

    return yield* client.announcement.listAnnouncements({});
  }
);

/** Creates an announcement for the authenticated administrator. */
export const createAnnouncement = Effect.fn("Web.Announcement.create")(
  function* createAnnouncementEffect(payload: CreateAnnouncementPayload) {
    const client = yield* AppHttpApiClient;

    return yield* client.announcement.createAnnouncement({ payload });
  }
);

/** Deletes one announcement after decoding its browser-provided ID. */
export const deleteAnnouncement = Effect.fn("Web.Announcement.delete")(
  function* deleteAnnouncementEffect(input: DeleteAnnouncementInput) {
    const client = yield* AppHttpApiClient;

    return yield* client.announcement.deleteAnnouncement({
      payload: { id: yield* asAnnouncementId(input.id) },
    });
  }
);

/** Promise runner type used by announcement query and mutation adapters. */
export type AnnouncementApiRunner = typeof runAppHttpApi;
