import * as Arr from "effect/Array";
import * as Option from "effect/Option";

interface ServerResource {
  readonly dispose: () => Promise<void>;
}

const disposeAll = async (
  resources: readonly ServerResource[]
): Promise<void> => {
  const results = await Promise.allSettled(
    Arr.map(({ dispose }: ServerResource) => Promise.resolve().then(dispose))(
      resources
    )
  );
  const failures = Arr.getSomes(
    Arr.map((result: PromiseSettledResult<void>) =>
      result.status === "rejected" ? Option.some(result.reason) : Option.none()
    )(results)
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
