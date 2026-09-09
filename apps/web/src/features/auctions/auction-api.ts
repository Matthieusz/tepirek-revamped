import type {
  AuctionGroupPayload,
  AuctionSignupPayload,
  AuctionSignupSummary,
} from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import { Effect } from "effect";

import { asAuctionSignupId } from "@/lib/branded-ids";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import type { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Input that identifies one auction type and profession group. */
export type AuctionGroupInput = AuctionGroupPayload;

/** Input for toggling one auction signup. */
export type ToggleAuctionSignupInput = typeof AuctionSignupPayload.Type;

/** Input for removing one auction signup. */
export interface RemoveAuctionSignupInput {
  readonly id: number;
}

/** Signup data returned by the auction API. */
export type AuctionSignup = AuctionSignupSummary;

/** Lists signups for one auction group. */
export const listAuctionSignups = Effect.fn("Web.Auction.listSignups")(
  function* listAuctionSignupsEffect(payload: AuctionGroupInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.auction.getAuctionSignups({ payload });
  }
);

/** Loads signup statistics for one auction group. */
export const getAuctionStats = Effect.fn("Web.Auction.getStats")(
  function* getAuctionStatsEffect(payload: AuctionGroupInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.auction.getAuctionStats({ payload });
  }
);

/** Removes all signups from one auction group. */
export const clearAuctionSignups = Effect.fn("Web.Auction.clearSignups")(
  function* clearAuctionSignupsEffect(payload: AuctionGroupInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.auction.clearAuctionSignups({ payload });
  }
);

/** Toggles the current user's signup in one auction slot. */
export const toggleAuctionSignup = Effect.fn("Web.Auction.toggleSignup")(
  function* toggleAuctionSignupEffect(payload: ToggleAuctionSignupInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.auction.toggleAuctionSignup({ payload });
  }
);

/** Removes one signup after decoding its browser-provided identifier. */
export const removeAuctionSignup = Effect.fn("Web.Auction.removeSignup")(
  function* removeAuctionSignupEffect(input: RemoveAuctionSignupInput) {
    const client = yield* AppHttpApiClient;
    return yield* client.auction.removeAuctionSignup({
      payload: { id: yield* asAuctionSignupId(input.id) },
    });
  }
);

/** Promise runner type used by auction query and mutation adapters. */
export type AuctionApiRunner = typeof runAppHttpApi;
