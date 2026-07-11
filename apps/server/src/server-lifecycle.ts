export interface ServerResource {
  readonly dispose: () => Promise<void>;
}

const disposeAll = async (
  resources: readonly ServerResource[]
): Promise<void> => {
  await Promise.all(resources.map(({ dispose }) => dispose()));
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
