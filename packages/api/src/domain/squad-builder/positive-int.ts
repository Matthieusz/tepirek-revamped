import * as Schema from "effect/Schema";

/** HTTP/API schema for a positive safe integer. */
export const PositiveInt = Schema.Number.check(
  Schema.isInt(),
  Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
);
