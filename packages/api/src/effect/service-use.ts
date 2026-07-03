import type * as Context from "effect/Context";
import type { Effect } from "effect/Effect";

type ServiceUseMethod<Identifier, Method> = Method extends (
  ...args: infer Args
) => Effect<infer Success, infer Error, infer Requirements>
  ? (...args: Args) => Effect<Success, Error, Requirements | Identifier>
  : never;

export type ServiceUse<Identifier, Shape> = {
  readonly [Key in keyof Shape as Shape[Key] extends (
    ...args: infer _Args
  ) => Effect<infer _Success, infer _Error, infer _Requirements>
    ? Key
    : never]: ServiceUseMethod<Identifier, Shape[Key]>;
};

export const serviceUse = <Identifier, Shape>(
  tag: Context.Service<Identifier, Shape>
): ServiceUse<Identifier, Shape> =>
  new Proxy(
    {},
    {
      get: (_target, key) => {
        if (typeof key !== "string" && typeof key !== "symbol") {
          return;
        }

        return (...args: readonly unknown[]) =>
          tag.use((service) => {
            // SAFETY: serviceUse only exposes keys whose Shape value is typed as an
            // Effect-returning method. The proxy receives the same property key and
            // forwards the original call arguments to that method on the service
            // acquired from Context.Service.use.
            const method = service[key as keyof Shape] as unknown as (
              ...methodArgs: readonly unknown[]
            ) => Effect<unknown, unknown, unknown>;

            return method(...args);
          });
      },
    }
    // SAFETY: The proxy lazily implements every Effect-returning method in Shape
    // by delegating through tag.use. Non-method and non-Effect-returning members
    // are intentionally omitted by the ServiceUse mapped type.
  ) as ServiceUse<Identifier, Shape>;
