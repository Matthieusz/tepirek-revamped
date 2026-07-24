import { Crypto, Effect } from "effect";

/** Generate the short identifier shared by one observability layer acquisition. */
export const makeRunId = Effect.gen(function* makeObservabilityRunId() {
  const cryptoService = yield* Crypto.Crypto;
  const uuid = yield* cryptoService.randomUUIDv4;
  return uuid.slice(0, 8);
});
