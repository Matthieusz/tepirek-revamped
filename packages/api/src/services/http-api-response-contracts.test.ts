import type { Effect } from "effect/Effect";
import { expectTypeOf, it } from "vitest";

import type {
  LatestBetForCopy,
  PaginatedBets,
} from "../protocol/bet/http-api-contract.ts";
import type { RankingResult } from "../protocol/ranking/http-api-contract.ts";
import type { BetServiceInterface } from "./bet/bet-service.ts";
import type { RankingServiceInterface } from "./ranking/ranking-service.ts";

type EffectSuccess<T> =
  T extends Effect<infer Success, unknown, unknown> ? Success : never;

it("keeps service query results aligned with HttpApi response schemas", () => {
  expectTypeOf<
    EffectSuccess<ReturnType<BetServiceInterface["getPaginatedBets"]>>
  >().toEqualTypeOf<PaginatedBets>();
  expectTypeOf<
    EffectSuccess<ReturnType<BetServiceInterface["getLatestBetForCopy"]>>
  >().toEqualTypeOf<typeof LatestBetForCopy.Type>();
  expectTypeOf<
    EffectSuccess<ReturnType<RankingServiceInterface["getRanking"]>>
  >().toEqualTypeOf<RankingResult>();
});
