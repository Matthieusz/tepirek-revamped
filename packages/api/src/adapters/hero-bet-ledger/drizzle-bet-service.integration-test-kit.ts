import { expect } from "@effect/vitest";
import { makeLiveDatabaseLayer } from "@tepirek-revamped/db/effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { TestClock } from "effect/testing";

import { BetId, EventId, HeroId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import type {
  BetServiceInterface,
  CreateBetInput,
  EditBetInput,
  GetPaginatedBetsInput,
} from "../../services/bet/bet-service.ts";
import { BetService } from "../../services/bet/bet-service.ts";
import type {
  GetRankingInput,
  RankingServiceInterface,
} from "../../services/ranking/ranking-service.ts";
import { RankingService } from "../../services/ranking/ranking-service.ts";
import type {
  DistributeGoldInput,
  TogglePaidOutInput,
  VaultServiceInterface,
} from "../../services/vault/vault-service.ts";
import { VaultService } from "../../services/vault/vault-service.ts";
import { defaultTestDatabaseUrl } from "../../test/integration/database.ts";
import { DrizzleBetServiceLayer } from "./drizzle-bet-service.ts";
import { DrizzleRankingServiceLayer } from "./drizzle-ranking-service.ts";
import { DrizzleVaultServiceLayer } from "./drizzle-vault-service.ts";

export {
  createHero,
  createVerifiedMember,
} from "../../test/integration/builders.ts";

/** Shared live layers used by the hero-bet-ledger integration tests. */
export const testLayer = (() => {
  const databaseLayer = makeLiveDatabaseLayer(defaultTestDatabaseUrl);

  return Layer.mergeAll(
    DrizzleBetServiceLayer.pipe(Layer.provide(databaseLayer)),
    DrizzleRankingServiceLayer.pipe(Layer.provide(databaseLayer)),
    DrizzleVaultServiceLayer.pipe(Layer.provide(databaseLayer))
  );
})();

/** Service operations exposed to ledger integration tests. */
export interface TestServices {
  readonly createBet: (
    input: Omit<CreateBetInput, "createdBy" | "heroId" | "userIds"> & {
      readonly createdBy: string;
      readonly heroId: number;
      readonly userIds: readonly string[];
    }
  ) => ReturnType<BetServiceInterface["createBet"]>;
  readonly deleteBet: (
    id: number
  ) => ReturnType<BetServiceInterface["deleteBet"]>;
  readonly editBet: (
    input: Omit<EditBetInput, "betId" | "newUserIds"> & {
      readonly betId: number;
      readonly newUserIds: readonly string[];
    }
  ) => ReturnType<BetServiceInterface["editBet"]>;
  readonly getAllBets: BetServiceInterface["getAllBets"];
  readonly getPaginatedBets: (
    input: Omit<GetPaginatedBetsInput, "eventId" | "heroId"> & {
      readonly eventId?: number | undefined;
      readonly heroId?: number | undefined;
    }
  ) => ReturnType<BetServiceInterface["getPaginatedBets"]>;
  readonly getBetMembers: (
    betId: number
  ) => ReturnType<BetServiceInterface["getBetMembers"]>;
  readonly getBetsByEvent: (
    eventId: number
  ) => ReturnType<BetServiceInterface["getBetsByEvent"]>;
  readonly getLatestBetForCopy: BetServiceInterface["getLatestBetForCopy"];
  readonly getHeroStats: (
    heroId: number
  ) => ReturnType<RankingServiceInterface["getHeroStats"]>;
  readonly getOldestUnpaidEvent: RankingServiceInterface["getOldestUnpaidEvent"];
  readonly getRanking: (
    input: Omit<GetRankingInput, "eventId" | "heroId"> & {
      readonly eventId?: number | undefined;
      readonly heroId?: number | undefined;
    }
  ) => ReturnType<RankingServiceInterface["getRanking"]>;
  readonly distributeGold: (
    input: Omit<DistributeGoldInput, "heroId"> & { readonly heroId: number }
  ) => ReturnType<VaultServiceInterface["distributeGold"]>;
  readonly getVault: (
    eventId?: number
  ) => ReturnType<VaultServiceInterface["getVault"]>;
  readonly togglePaidOut: (
    input: Omit<TogglePaidOutInput, "eventId" | "userId"> & {
      readonly eventId: number;
      readonly userId: string;
    }
  ) => ReturnType<VaultServiceInterface["togglePaidOut"]>;
}

/** Run an assertion against freshly adapted, clock-controlled ledger services. */
export const withServices = <A>(
  f: (services: TestServices) => Effect.Effect<A, unknown>,
  currentTime?: Date
) =>
  Effect.gen(function* provideServices() {
    yield* TestClock.setTime(currentTime?.getTime() ?? 0);
    const bet = yield* BetService;
    const ranking = yield* RankingService;
    const vault = yield* VaultService;
    return yield* f({
      createBet: (input) =>
        bet.createBet({
          ...input,
          createdBy: AppUserId.make(input.createdBy),
          heroId: HeroId.make(input.heroId),
          userIds: input.userIds.map((userId) => AppUserId.make(userId)),
        }),
      deleteBet: (id) => bet.deleteBet(BetId.make(id)),
      distributeGold: (input) =>
        vault.distributeGold({
          ...input,
          heroId: HeroId.make(input.heroId),
        }),
      editBet: (input) =>
        bet.editBet({
          ...input,
          betId: BetId.make(input.betId),
          newUserIds: input.newUserIds.map((userId) => AppUserId.make(userId)),
        }),
      getAllBets: bet.getAllBets,
      getBetMembers: (betId) => bet.getBetMembers(BetId.make(betId)),
      getBetsByEvent: (eventId) => bet.getBetsByEvent(EventId.make(eventId)),
      getHeroStats: (heroId) => ranking.getHeroStats(HeroId.make(heroId)),
      getLatestBetForCopy: bet.getLatestBetForCopy,
      getOldestUnpaidEvent: ranking.getOldestUnpaidEvent,
      getPaginatedBets: (input) => {
        const { eventId, heroId, ...pagination } = input;
        return bet.getPaginatedBets({
          ...pagination,
          eventId: eventId === undefined ? undefined : EventId.make(eventId),
          heroId: heroId === undefined ? undefined : HeroId.make(heroId),
        });
      },
      getRanking: (input) => {
        const { eventId, heroId } = input;
        return ranking.getRanking({
          eventId: eventId === undefined ? undefined : EventId.make(eventId),
          heroId: heroId === undefined ? undefined : HeroId.make(heroId),
        });
      },
      getVault: (eventId) =>
        vault.getVault(
          eventId === undefined ? undefined : EventId.make(eventId)
        ),
      togglePaidOut: (input) =>
        vault.togglePaidOut({
          ...input,
          eventId: EventId.make(input.eventId),
          userId: AppUserId.make(input.userId),
        }),
    });
  });

/** Assert the stable error projection exposed by a ledger operation. */
export const expectLedgerError = <R>(
  action: Effect.Effect<unknown, unknown, R>,
  tag: string,
  message: string
) =>
  Effect.gen(function* testEffect() {
    const failure = yield* Effect.flip(action);
    expect(failure).toMatchObject({ _tag: tag, message });
  });

/** Sort read-model rows by their stable user identifier for deterministic assertions. */
export const sortByUserId = <T extends { userId: string }>(
  rows: readonly T[]
) => rows.toSorted((left, right) => left.userId.localeCompare(right.userId));
