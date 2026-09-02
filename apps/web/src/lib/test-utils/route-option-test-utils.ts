/** Invokes a route option callback that does not read its context. */
export const invokeRouteHook = async <TResult>(
  hook: ((...args: never[]) => TResult | Promise<TResult>) | undefined
): Promise<TResult | undefined> => await hook?.();
