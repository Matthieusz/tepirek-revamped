import * as Effect from "effect/Effect";

const INTERNAL_FAILURE_TAGS = new Set([
  "FirecrawlRequestFailed",
  "FirecrawlResponseNotParseable",
  "SquadBuilderPersistenceUnavailable",
]);

interface InternalFailure {
  readonly _tag: string;
  readonly operation?: string;
  readonly profileId?: number;
}

const isInternalFailure = (error: unknown): error is InternalFailure =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  typeof error._tag === "string" &&
  INTERNAL_FAILURE_TAGS.has(error._tag);

/** Logs only safe metadata for internal squad-builder dependency failures. */
export const logSquadBuilderInternalFailure = (
  error: unknown
): Effect.Effect<void> => {
  if (!isInternalFailure(error)) {
    return Effect.void;
  }

  return Effect.logError("Squad-builder dependency operation failed").pipe(
    Effect.annotateLogs({
      errorTag: error._tag,
      ...(typeof error.operation === "string"
        ? { operation: error.operation }
        : {}),
      ...(typeof error.profileId === "number"
        ? { profileId: error.profileId }
        : {}),
    })
  );
};
