export interface ServerResource {
  readonly dispose: () => Promise<void>;
}

const disposeAll = async (
  resources: readonly ServerResource[]
): Promise<void> => {
  const results = await Promise.allSettled(
    resources.map(({ dispose }) => Promise.resolve().then(dispose))
  );
  const failures = results.flatMap((result) =>
    result.status === "rejected" ? [result.reason] : []
  );

  if (failures.length > 0) {
    throw new AggregateError(failures, "Failed to dispose server resources");
  }
};

/** Create an idempotent shutdown operation for process-owned resources. */
export const makeShutdown = (
  resources: readonly ServerResource[]
): (() => Promise<void>) => {
  let shutdownPromise: Promise<void> | undefined;

  return () => {
    shutdownPromise ??= disposeAll(resources);
    return shutdownPromise;
  };
};
