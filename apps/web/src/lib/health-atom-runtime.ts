import * as Atom from "effect/unstable/reactivity/Atom";

import { HealthHttpApiClient } from "@/lib/health-http-api-client-runtime";

/** Atom runtime retained temporarily for the health resource migration. */
export const healthHttpApiRuntime = Atom.runtime(HealthHttpApiClient.layer);
