import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

/** Applies an optimistic update only to an available success value. */
export const updateResultSuccess = <A, E>(
  result: AsyncResult.AsyncResult<A, E>,
  update: (value: A) => A
): AsyncResult.AsyncResult<A, E> => {
  if (!AsyncResult.isSuccess(result)) {
    return result;
  }

  return AsyncResult.success(update(result.value), {
    timestamp: result.timestamp,
    waiting: result.waiting,
  });
};
