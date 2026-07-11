import * as Schema from "effect/Schema";

/** Internal persistence failure retained for diagnostics at the server boundary. */
export class TodoStoreError extends Schema.TaggedErrorClass<TodoStoreError>()(
  "TodoStoreError",
  { cause: Schema.Defect(), operation: Schema.String }
) {}
