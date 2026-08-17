/** Invokes a route option callback with a test router context. */
export const invokeRouteHook = async <TContext, TResult>(
  hook: ((context: TContext) => TResult | Promise<TResult>) | undefined,
  context?: TContext
): Promise<TResult | undefined> => {
  if (hook === undefined) {
    return undefined;
  }

  // SAFETY: callers omit context only for callbacks that do not read it.
  return await hook(context as TContext);
};
