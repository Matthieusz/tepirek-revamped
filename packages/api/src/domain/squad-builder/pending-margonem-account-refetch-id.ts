import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A validated pending Margonem account refetch preview id. */
export const PendingMargonemAccountRefetchId = PositiveInt.pipe(
  Schema.brand("PendingMargonemAccountRefetchId")
).annotate({
  identifier: "PendingMargonemAccountRefetchId",
});
export type PendingMargonemAccountRefetchId =
  typeof PendingMargonemAccountRefetchId.Type;

/** HTTP/API schema for a validated pending account refetch preview id. */
export const PendingMargonemAccountRefetchIdSchema =
  PendingMargonemAccountRefetchId;

/** Expected failure when a pending refetch id is not a positive integer. */
export interface InvalidPendingMargonemAccountRefetchId {
  readonly _tag: "InvalidPendingMargonemAccountRefetchId";
}

/** Parse a positive integer as a pending Margonem account refetch id. */
export const parsePendingMargonemAccountRefetchId = Effect.fn(
  "PendingMargonemAccountRefetchId.parse"
)(function* parsePendingMargonemAccountRefetchId(input: number) {
  return yield* Schema.decodeUnknownEffect(PendingMargonemAccountRefetchId)(
    input
  ).pipe(
    Effect.catchTag("SchemaError", () =>
      Effect.fail({ _tag: "InvalidPendingMargonemAccountRefetchId" } as const)
    )
  );
});

/** Convert a pending refetch id to its primitive representation. */
export const pendingRefetchIdToNumber = (
  id: PendingMargonemAccountRefetchId
): number => id;
