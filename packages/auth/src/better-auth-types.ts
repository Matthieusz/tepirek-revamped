import type { createAuth } from "./better-auth-instance.ts";

/** Vendor Better Auth runtime instance mounted by the Effect HTTP adapter. */
export type BetterAuthInstance = ReturnType<typeof createAuth>;

/** Session payload returned by Better Auth's vendor API. */
export type BetterAuthSession = Awaited<
  ReturnType<BetterAuthInstance["api"]["getSession"]>
>;
