import * as Schema from "effect/Schema";

/** Internal persistence failure retained for diagnostics at the server boundary. */
export class AuctionStoreError extends Schema.TaggedErrorClass<AuctionStoreError>()(
  "AuctionStoreError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}
