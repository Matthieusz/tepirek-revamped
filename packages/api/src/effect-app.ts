import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
/** Live Layer for Effect-based API modules. */
export const makeApiLiveLayer = (databaseUrl: string) =>
  makeLiveDatabaseLayer(databaseUrl);
