import * as Effect from "effect/Effect";

import { AuctionStore } from "./auction-store.ts";

export const getAuctionSignups = Effect.fn("Auction.getSignups")(
  function* getAuctionSignups(
    input: Parameters<(typeof AuctionStore.Service)["getSignups"]>[0]
  ) {
    const store = yield* AuctionStore;
    return yield* store.getSignups(input);
  }
);

export const getAuctionStats = Effect.fn("Auction.getStats")(
  function* getAuctionStats(
    input: Parameters<(typeof AuctionStore.Service)["getStats"]>[0]
  ) {
    const store = yield* AuctionStore;
    return yield* store.getStats(input);
  }
);

export const removeAuctionSignup = Effect.fn("Auction.removeSignup")(
  function* removeAuctionSignup(
    input: Parameters<(typeof AuctionStore.Service)["removeSignup"]>[0]
  ) {
    const store = yield* AuctionStore;
    return yield* store.removeSignup(input);
  }
);

export const toggleAuctionSignup = Effect.fn("Auction.toggleSignup")(
  function* toggleAuctionSignup(
    input: Parameters<(typeof AuctionStore.Service)["toggleSignup"]>[0]
  ) {
    const store = yield* AuctionStore;
    return yield* store.toggleSignup(input);
  }
);
