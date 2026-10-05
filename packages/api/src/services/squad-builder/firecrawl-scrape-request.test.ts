import { expect, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as Redacted from "effect/Redacted";
import { TestClock } from "effect/testing";

import { parseAppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { firecrawlYearMonthFromDate } from "../../domain/squad-builder/firecrawl-year-month.ts";
import { parseMargonemProfileId } from "../../domain/squad-builder/margonem-profile-id.ts";
import { makeFirecrawlRequestAccountingStoreServiceTestService } from "../../test/squad-builder/squad-group-store.ts";
import {
  FirecrawlClientService,
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
} from "./firecrawl-client.ts";
import type { FirecrawlClient } from "./firecrawl-client.ts";
import { FirecrawlConfigService } from "./firecrawl-config.ts";
import { FirecrawlRequestAccountingStoreService } from "./firecrawl-request-accounting-store.ts";
import type {
  MarkFirecrawlRequestFailedInput,
  MarkFirecrawlRequestSucceededInput,
  ReserveFirecrawlRequestInput,
} from "./firecrawl-request-accounting-store.ts";
import { scrapeProfile } from "./firecrawl-scrape-request.ts";
import {
  FirecrawlMonthlyBudgetExhausted,
  FirecrawlUserMonthlyBudgetExhausted,
  SquadBuilderPersistenceUnavailable,
} from "./squad-groups/squad-group-errors.ts";

const actorUserId = Effect.runSync(parseAppUserId("lifecycle-user"));

const profileId = Effect.runSync(parseMargonemProfileId(7_298_897));

const now = new Date("2026-10-05T12:00:00Z");

const persistenceError = (
  operation: SquadBuilderPersistenceUnavailable["operation"]
) =>
  new SquadBuilderPersistenceUnavailable({
    cause: new Error("unavailable"),
    operation,
    provider: "postgres",
  });

const makeFixture = (
  overrides: Partial<
    typeof FirecrawlRequestAccountingStoreService.Service
  > = {},
  scrape: FirecrawlClient["scrapeProfileHtml"] = () =>
    Effect.succeed({ html: "invalid profile", metadata: {} })
) => {
  const reservations: ReserveFirecrawlRequestInput[] = [];
  const succeeded: MarkFirecrawlRequestSucceededInput[] = [];
  const failed: MarkFirecrawlRequestFailedInput[] = [];
  const attempts: number[] = [];

  const accounting = makeFirecrawlRequestAccountingStoreServiceTestService({
    markRequestFailed: (input) =>
      Effect.sync(() => {
        failed.push(input);
      }),
    markRequestSucceeded: (input) =>
      Effect.sync(() => {
        succeeded.push(input);
      }),
    reserveRequest: (input) =>
      Effect.sync(() => {
        reservations.push(input);

        return {
          budgetState: {
            monthlyRequestBudget: input.monthlyRequestBudget,
            remainingRequests: input.monthlyRequestBudget - reservations.length,
            usedRequests: reservations.length,
            yearMonth: input.yearMonth,
          },
          requestId: reservations.length,
        };
      }),
    ...overrides,
  });

  const provide = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.provideService(FirecrawlConfigService)({
        apiKey: Redacted.make("test-key"),
        monthlyRequestBudget: 900,
        perUserMonthlyRequestBudget: 100,
      }),
      Effect.provideService(FirecrawlClientService)({
        scrapeProfileHtml: (id) =>
          Effect.suspend(() => {
            attempts.push(id);

            return scrape(id);
          }),
        scrapeUrlHtml: () => Effect.die(new Error("Unexpected URL scrape")),
      }),
      Effect.provideService(FirecrawlRequestAccountingStoreService)(accounting)
    );

  const run = () => provide(scrapeProfile({ actorUserId, profileId }));

  return { attempts, failed, provide, reservations, run, succeeded };
};

it.effect("returns accounted HTML without parsing the profile", () =>
  Effect.gen(function* lifecycleCase1() {
    yield* TestClock.setTime(now.getTime());
    const fixture = makeFixture();
    expect(yield* fixture.run()).toEqual({
      creditsUsed: 1,
      html: "invalid profile",
    });
    expect(fixture.succeeded).toEqual([
      {
        cacheState: null,
        completedAt: now,
        creditsUsed: 1,
        firecrawlStatusCode: null,
        requestId: 1,
      },
    ]);
    expect(fixture.failed).toEqual([]);
  })
);

for (const operation of [
  "markRequestFailed",
  "markRequestSucceeded",
] as const) {
  it.effect(`preserves ${operation} persistence failure precedence`, () =>
    Effect.gen(function* lifecycleCase2() {
      const error = persistenceError(operation);

      const fixture = makeFixture(
        { [operation]: () => Effect.fail(error) },
        () =>
          operation === "markRequestFailed"
            ? Effect.fail(
                new FirecrawlRequestFailed({
                  cause: new Error("scrape"),
                  profileId,
                })
              )
            : Effect.succeed({ html: "html", metadata: {} })
      );

      expect(yield* Effect.flip(fixture.run())).toBe(error);
      expect(fixture.failed).toEqual([]);
      expect(fixture.attempts).toEqual([profileId]);
    })
  );
}

for (const cleanupFails of [false, true]) {
  it.effect(
    `characterizes pending completion cancellation (cleanup failure: ${cleanupFails})`,
    () =>
      Effect.gen(function* lifecycleCase3() {
        const started = yield* Deferred.make<boolean>();
        const pending = yield* Deferred.make<never>();
        const records: MarkFirecrawlRequestFailedInput[] = [];
        const error = persistenceError("markRequestFailed");

        const fixture = makeFixture({
          markRequestFailed: (input) =>
            Effect.sync(() => {
              records.push(input);
            }).pipe(
              Effect.andThen(cleanupFails ? Effect.fail(error) : Effect.void)
            ),
          markRequestSucceeded: () =>
            Deferred.succeed(started, true).pipe(
              Effect.andThen(Deferred.await(pending))
            ),
        });

        const fiber = yield* Effect.forkChild(fixture.run());
        yield* Deferred.await(started);
        yield* Fiber.interrupt(fiber);
        const exit = yield* Fiber.await(fiber);
        expect(Exit.isFailure(exit)).toBe(true);

        if (Exit.isFailure(exit)) {
          expect(exit.cause.reasons.map((reason) => reason._tag)).toEqual(
            cleanupFails ? ["Interrupt", "Fail"] : ["Interrupt"]
          );
          expect(
            exit.cause.reasons
              .filter(Cause.isFailReason)
              .map((reason) => reason.error)
          ).toEqual(cleanupFails ? [error] : []);
        }

        expect(records).toEqual([
          { completedAt: new Date(0), errorTag: "Interrupted", requestId: 1 },
        ]);
        expect(fixture.succeeded).toEqual([]);
      })
  );
}

for (const creditsUsed of [0, 3]) {
  it.effect(`preserves credits and metadata: ${creditsUsed}`, () =>
    Effect.gen(function* lifecycleCase4() {
      yield* TestClock.setTime(now.getTime());

      const fixture = makeFixture({}, () =>
        Effect.succeed({
          html: "html",
          metadata: { cacheState: "hit", creditsUsed, statusCode: 200 },
        })
      );

      expect(yield* fixture.run()).toEqual({ creditsUsed, html: "html" });
      expect(fixture.reservations).toEqual([
        {
          monthlyRequestBudget: 900,
          perUserMonthlyRequestBudget: 100,
          profileId,
          requestedByUserId: actorUserId,
          yearMonth: firecrawlYearMonthFromDate(now),
        },
      ]);
      expect(fixture.succeeded).toEqual([
        {
          cacheState: "hit",
          completedAt: now,
          creditsUsed,
          firecrawlStatusCode: 200,
          requestId: 1,
        },
      ]);
    })
  );
}

for (const creditsUsed of [
  -1,
  0.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  Number.MAX_SAFE_INTEGER + 1,
]) {
  it.effect(`rejects malformed credits: ${creditsUsed}`, () =>
    Effect.gen(function* lifecycleCase5() {
      const fixture = makeFixture({}, () =>
        Effect.succeed({ html: "html", metadata: { creditsUsed } })
      );

      const error = yield* Effect.flip(fixture.run());
      expect(error).toBeInstanceOf(FirecrawlResponseNotParseable);
      expect(error).toMatchObject({
        cause: new Error("Invalid Firecrawl creditsUsed"),
        profileId,
      });
      expect(fixture.failed).toEqual([
        {
          completedAt: new Date(0),
          errorTag: "FirecrawlResponseNotParseable",
          requestId: 1,
        },
      ]);
      expect(fixture.succeeded).toEqual([]);
    })
  );
}

for (const ErrorClass of [
  FirecrawlMonthlyBudgetExhausted,
  FirecrawlUserMonthlyBudgetExhausted,
]) {
  it.effect(`preserves ${ErrorClass.name} without scraping`, () =>
    Effect.gen(function* lifecycleCase6() {
      const error = new ErrorClass({
        monthlyRequestBudget: 10,
        usedRequests: 10,
        yearMonth: firecrawlYearMonthFromDate(now),
      });

      const fixture = makeFixture({ reserveRequest: () => Effect.fail(error) });
      expect(yield* Effect.flip(fixture.run())).toBe(error);
      expect(fixture.attempts).toEqual([]);
      expect(fixture.failed).toEqual([]);
      expect(fixture.succeeded).toEqual([]);
    })
  );
}

it.effect("preserves reservation persistence failure", () =>
  Effect.gen(function* lifecycleCase7() {
    const error = persistenceError("reserveRequest");
    const fixture = makeFixture({ reserveRequest: () => Effect.fail(error) });
    expect(yield* Effect.flip(fixture.run())).toBe(error);
    expect(fixture.attempts).toEqual([]);
    expect(fixture.failed).toEqual([]);
    expect(fixture.succeeded).toEqual([]);
  })
);

for (const ErrorClass of [
  FirecrawlRequestFailed,
  FirecrawlResponseNotParseable,
]) {
  it.effect(`records and propagates ${ErrorClass.name}`, () =>
    Effect.gen(function* lifecycleCase8() {
      const error = new ErrorClass({ cause: new Error("scrape"), profileId });
      const fixture = makeFixture({}, () => Effect.fail(error));
      expect(yield* Effect.flip(fixture.run())).toBe(error);
      expect(fixture.failed).toEqual([
        { completedAt: new Date(0), errorTag: error._tag, requestId: 1 },
      ]);
      expect(fixture.succeeded).toEqual([]);
    })
  );
}

it.effect("records interruption of a pending scrape once", () =>
  Effect.gen(function* lifecycleCase9() {
    const started = yield* Deferred.make<boolean>();
    const pending = yield* Deferred.make<never>();

    const fixture = makeFixture({}, () =>
      Deferred.succeed(started, true).pipe(
        Effect.andThen(Deferred.await(pending))
      )
    );

    const fiber = yield* Effect.forkChild(fixture.run());
    yield* Deferred.await(started);
    yield* Fiber.interrupt(fiber);
    const exit = yield* Fiber.await(fiber);
    expect(Exit.isFailure(exit)).toBe(true);

    if (Exit.isFailure(exit)) {
      expect(exit.cause.reasons.map((reason) => reason._tag)).toEqual([
        "Interrupt",
      ]);
    }

    expect(fixture.failed).toEqual([
      { completedAt: new Date(0), errorTag: "Interrupted", requestId: 1 },
    ]);
  })
);

it.effect("keeps interleaved completions attached to their reservations", () =>
  Effect.gen(function* lifecycleCase10() {
    const started = yield* Deferred.make<boolean>();
    const release = yield* Deferred.make<boolean>();
    const secondId = yield* parseMargonemProfileId(42);
    const secondActor = yield* parseAppUserId("second-user");

    const fixture = makeFixture({}, (id) =>
      id === profileId
        ? Deferred.succeed(started, true).pipe(
            Effect.andThen(Deferred.await(release)),
            Effect.as({ html: "first", metadata: { creditsUsed: 2 } })
          )
        : Effect.succeed({ html: "second", metadata: { creditsUsed: 0 } })
    );

    const first = yield* Effect.forkChild(fixture.run());
    yield* Deferred.await(started);
    expect(
      yield* fixture.provide(
        scrapeProfile({ actorUserId: secondActor, profileId: secondId })
      )
    ).toEqual({ creditsUsed: 0, html: "second" });
    yield* Deferred.succeed(release, true);
    expect(yield* Fiber.join(first)).toEqual({ creditsUsed: 2, html: "first" });
    expect(
      fixture.reservations.map((record) => [
        record.requestedByUserId,
        record.profileId,
      ])
    ).toEqual([
      [actorUserId, profileId],
      [secondActor, secondId],
    ]);
    expect(
      fixture.succeeded.map((record) => [record.requestId, record.creditsUsed])
    ).toEqual([
      [2, 0],
      [1, 2],
    ]);
  })
);
