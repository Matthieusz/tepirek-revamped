import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { PositiveInt } from "./positive-int.js";

/** A validated pending Margonem account import id. */
export const PendingMargonemAccountImportId = PositiveInt.pipe(
  Schema.brand("PendingMargonemAccountImportId")
).annotate({
  identifier: "PendingMargonemAccountImportId",
});
export type PendingMargonemAccountImportId =
  typeof PendingMargonemAccountImportId.Type;

/** HTTP/API schema for a validated pending account import id. */
export const PendingMargonemAccountImportIdSchema =
  PendingMargonemAccountImportId;

/** Expected failure when a pending import id is not a positive integer. */
export interface InvalidPendingMargonemAccountImportId {
  readonly _tag: "InvalidPendingMargonemAccountImportId";
}

/** Parse a positive integer as a pending Margonem account import id. */
export const parsePendingMargonemAccountImportId = Effect.fn(
  "PendingMargonemAccountImportId.parse"
)(function* parsePendingMargonemAccountImportId(input: number) {
  return yield* Schema.decodeUnknownEffect(PendingMargonemAccountImportId)(
    input
  ).pipe(
    Effect.catchTag("SchemaError", () =>
      Effect.fail({ _tag: "InvalidPendingMargonemAccountImportId" } as const)
    )
  );
});

/** Convert a pending import id to its primitive representation. */
export const pendingImportIdToNumber = (
  id: PendingMargonemAccountImportId
): number => id;
