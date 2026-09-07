import * as Atom from "effect/unstable/reactivity/Atom";

import { AppHttpApiClient as AppHttpApiClientService } from "@/lib/http-api-client-runtime";

/** Atom runtime retained temporarily for resources not yet migrated. */
export const appHttpApiRuntime = Atom.runtime(AppHttpApiClientService.layer);

/** Convenience helper for creating runtime-backed API atoms during migration. */
export const appHttpApiAtom: typeof appHttpApiRuntime.atom =
  appHttpApiRuntime.atom.bind(appHttpApiRuntime);

/** Convenience helper for creating runtime-backed API mutation atoms. */
export const appHttpApiFn: typeof appHttpApiRuntime.fn =
  appHttpApiRuntime.fn.bind(appHttpApiRuntime);

export { AppHttpApiClient } from "@/lib/http-api-client-runtime";
