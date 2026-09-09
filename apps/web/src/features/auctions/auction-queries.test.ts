import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import {
  AuctionGroupPayload,
  AuctionSignupSummary,
  AuctionStats,
} from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { Effect, Layer } from "effect";
import * as Schema from "effect/Schema";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { describe, expect, it, vi } from "vitest";

import type {
  AuctionApiRunner,
  AuctionGroupInput,
  AuctionSignup,
} from "@/features/auctions/auction-api";
import {
  auctionSignupsQueryKey,
  auctionSignupsQueryOptions,
  auctionStatsQueryKey,
  auctionStatsQueryOptions,
  removeAuctionSignupMutationOptions,
  toggleAuctionSignupMutationOptions,
} from "@/features/auctions/auction-queries";
import {
  AppHttpApiClient,
  makeAppHttpApiRunner,
} from "@/lib/http-api-client-runtime";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

interface Deferred<A> {
  readonly promise: Promise<A>;
  readonly resolve: (value: A) => void;
}

const deferred = <A>(): Deferred<A> => {
  let resolvePromise: (value: A) => void;
  // oxlint-disable-next-line promise/avoid-new -- tests need manually controlled responses
  const promise = new Promise<A>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: (value) => {
      resolvePromise(value);
    },
  };
};

type PlannedResponse = Response | Promise<Response>;
type AuctionOperation = "remove" | "signups" | "stats" | "toggle";

interface AuctionTransport {
  readonly calls: {
    readonly remove: number;
    readonly signups: ReadonlyMap<string, number>;
    readonly stats: ReadonlyMap<string, number>;
    readonly toggle: number;
  };
  readonly runner: AuctionApiRunner;
}

const groupKey = (group: AuctionGroupInput): string =>
  `${group.type}:${group.profession}`;

const decodeGroup = (bodyBytes: Uint8Array): string =>
  groupKey(
    Schema.decodeUnknownSync(AuctionGroupPayload)(
      JSON.parse(new TextDecoder().decode(bodyBytes))
    )
  );

const takeResponse = (
  queue: PlannedResponse[] | undefined,
  operation: AuctionOperation,
  key?: string
): PlannedResponse => {
  const response = queue?.shift();
  if (response === undefined) {
    throw new Error(
      `No planned response for auction ${operation}${key === undefined ? "" : ` ${key}`}`
    );
  }
  return response;
};

const makeAuctionTransport = (plans: {
  readonly remove?: readonly PlannedResponse[];
  readonly signups?: Readonly<Record<string, readonly PlannedResponse[]>>;
  readonly stats?: Readonly<Record<string, readonly PlannedResponse[]>>;
  readonly toggle?: readonly PlannedResponse[];
}): AuctionTransport => {
  const signupQueues = new Map<string, PlannedResponse[]>();
  for (const [key, responses] of Object.entries(plans.signups ?? {})) {
    signupQueues.set(key, [...responses]);
  }
  const statsQueues = new Map<string, PlannedResponse[]>();
  for (const [key, responses] of Object.entries(plans.stats ?? {})) {
    statsQueues.set(key, [...responses]);
  }
  const removeQueue = [...(plans.remove ?? [])];
  const toggleQueue = [...(plans.toggle ?? [])];
  const calls = {
    remove: 0,
    signups: new Map<string, number>(),
    stats: new Map<string, number>(),
    toggle: 0,
  };

  const httpClient = HttpClient.make((request, url) => {
    let operation: AuctionOperation;
    if (url.pathname.endsWith("/signups/toggle")) {
      operation = "toggle";
    } else if (url.pathname.endsWith("/signups/remove")) {
      operation = "remove";
    } else if (url.pathname.endsWith("/stats")) {
      operation = "stats";
    } else {
      operation = "signups";
    }

    if (operation === "toggle") {
      calls.toggle += 1;
    }
    if (operation === "remove") {
      calls.remove += 1;
    }

    let key: string | undefined;
    if (operation === "signups" || operation === "stats") {
      if (request.body._tag !== "Uint8Array") {
        throw new Error("Expected an auction request body");
      }
      key = decodeGroup(request.body.body);
    }
    if (operation === "signups" || operation === "stats") {
      if (key === undefined) {
        throw new Error("Expected an auction group key");
      }
      const counts = operation === "signups" ? calls.signups : calls.stats;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    let planned: PlannedResponse;
    if (operation === "signups") {
      if (key === undefined) {
        throw new Error("Expected an auction group key");
      }
      planned = takeResponse(signupQueues.get(key), operation, key);
    } else if (operation === "stats") {
      if (key === undefined) {
        throw new Error("Expected an auction group key");
      }
      planned = takeResponse(statsQueues.get(key), operation, key);
    } else if (operation === "remove") {
      planned = takeResponse(removeQueue, operation);
    } else {
      planned = takeResponse(toggleQueue, operation);
    }

    if (planned instanceof Promise) {
      return Effect.promise(async () => await planned).pipe(
        Effect.map((response) => HttpClientResponse.fromWeb(request, response))
      );
    }
    return Effect.succeed(HttpClientResponse.fromWeb(request, planned));
  });
  const client = HttpApiClient.makeWith(AppHttpApi, {
    baseUrl: "http://localhost",
    httpClient,
  });

  return {
    calls,
    runner: makeAppHttpApiRunner(Layer.effect(AppHttpApiClient, client)),
  };
};

type JsonResponseValue =
  | boolean
  | Date
  | null
  | number
  | string
  | readonly JsonResponseValue[]
  | { readonly [key: string]: JsonResponseValue };

const jsonResponse = (body: JsonResponseValue, status = 200): Response =>
  Response.json(body, { status });

const makeSignup = (id: number, userId = `user-${id}`): AuctionSignup =>
  Schema.decodeSync(AuctionSignupSummary)({
    column: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    level: 30,
    round: 1,
    userId,
    userImage: null,
    userName: userId,
  });

const makeStats = (totalSignups: number, uniqueUsers: number) =>
  Schema.decodeSync(AuctionStats)({ totalSignups, uniqueUsers });

const groupA: AuctionGroupInput = { profession: "mage", type: "main" };
const groupB: AuctionGroupInput = {
  profession: "warrior",
  type: "main",
};

describe("auction queries and mutations", () => {
  it("keeps signup and stats caches separate while navigating between groups", async () => {
    const signupA = makeSignup(1);
    const signupB = makeSignup(2);
    const transport = makeAuctionTransport({
      signups: {
        [groupKey(groupA)]: [jsonResponse([signupA])],
        [groupKey(groupB)]: [jsonResponse([signupB])],
      },
      stats: {
        [groupKey(groupA)]: [jsonResponse(makeStats(1, 1))],
        [groupKey(groupB)]: [jsonResponse(makeStats(2, 2))],
      },
    });
    const testClient = makeTestQueryClient();

    try {
      await Promise.all([
        testClient.queryClient.query(
          auctionSignupsQueryOptions(groupA, transport.runner)
        ),
        testClient.queryClient.query(
          auctionStatsQueryOptions(groupA, transport.runner)
        ),
        testClient.queryClient.query(
          auctionSignupsQueryOptions(groupB, transport.runner)
        ),
        testClient.queryClient.query(
          auctionStatsQueryOptions(groupB, transport.runner)
        ),
      ]);
      await testClient.queryClient.query(
        auctionSignupsQueryOptions(groupA, transport.runner)
      );

      expect(auctionSignupsQueryKey(groupA)).toEqual([
        "auctions",
        "signups",
        "main",
        "mage",
      ]);
      expect(auctionStatsQueryKey(groupB)).toEqual([
        "auctions",
        "stats",
        "main",
        "warrior",
      ]);
      expect(
        testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupA))
      ).toEqual([signupA]);
      expect(
        testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupB))
      ).toEqual([signupB]);
      expect(transport.calls.signups.get(groupKey(groupA))).toBe(1);
      expect(transport.calls.signups.get(groupKey(groupB))).toBe(1);
      expect(transport.calls.stats.get(groupKey(groupA))).toBe(1);
      expect(transport.calls.stats.get(groupKey(groupB))).toBe(1);
    } finally {
      testClient.cleanup();
    }
  });

  it("refreshes signups and stats only for the mutated group", async () => {
    const signupA = makeSignup(1);
    const signupB = makeSignup(2);
    const transport = makeAuctionTransport({
      remove: [jsonResponse({ success: true })],
      signups: {
        [groupKey(groupA)]: [jsonResponse([signupA]), jsonResponse([])],
        [groupKey(groupB)]: [jsonResponse([signupB]), jsonResponse([])],
      },
      stats: {
        [groupKey(groupA)]: [
          jsonResponse(makeStats(1, 1)),
          jsonResponse(makeStats(0, 0)),
        ],
        [groupKey(groupB)]: [
          jsonResponse(makeStats(2, 2)),
          jsonResponse(makeStats(1, 1)),
        ],
      },
      toggle: [jsonResponse({ action: "removed" })],
    });
    const testClient = makeTestQueryClient();
    const observers = [
      new QueryObserver(
        testClient.queryClient,
        auctionSignupsQueryOptions(groupA, transport.runner)
      ),
      new QueryObserver(
        testClient.queryClient,
        auctionStatsQueryOptions(groupA, transport.runner)
      ),
      new QueryObserver(
        testClient.queryClient,
        auctionSignupsQueryOptions(groupB, transport.runner)
      ),
      new QueryObserver(
        testClient.queryClient,
        auctionStatsQueryOptions(groupB, transport.runner)
      ),
    ];
    const unsubscribers = observers.map((observer) =>
      observer.subscribe(() => {})
    );

    try {
      await Promise.all(
        observers.map(async (observer) => await observer.refetch())
      );
      const toggle = new MutationObserver(
        testClient.queryClient,
        toggleAuctionSignupMutationOptions(
          testClient.queryClient,
          groupA,
          transport.runner
        )
      );
      await toggle.mutate({
        column: 1,
        level: 30,
        profession: groupA.profession,
        round: 1,
        type: groupA.type,
      });

      const remove = new MutationObserver(
        testClient.queryClient,
        removeAuctionSignupMutationOptions(
          testClient.queryClient,
          groupB,
          transport.runner
        )
      );
      await remove.mutate({ id: signupB.id });

      expect(transport.calls.toggle).toBe(1);
      expect(transport.calls.remove).toBe(1);
      expect(transport.calls.signups.get(groupKey(groupA))).toBe(2);
      expect(transport.calls.stats.get(groupKey(groupA))).toBe(2);
      expect(transport.calls.signups.get(groupKey(groupB))).toBe(2);
      expect(transport.calls.stats.get(groupKey(groupB))).toBe(2);
      toggle.reset();
      remove.reset();
    } finally {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
      testClient.cleanup();
    }
  });

  it("rolls back an optimistic removal without changing another group", async () => {
    const signupA = makeSignup(1);
    const signupB = makeSignup(2);
    const failure = deferred<Response>();
    const transport = makeAuctionTransport({
      remove: [failure.promise],
    });
    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(auctionSignupsQueryKey(groupA), [
      signupA,
    ]);
    testClient.queryClient.setQueryData(auctionSignupsQueryKey(groupB), [
      signupB,
    ]);
    const errors: unknown[] = [];

    try {
      const remove = new MutationObserver(
        testClient.queryClient,
        removeAuctionSignupMutationOptions(
          testClient.queryClient,
          groupA,
          transport.runner,
          {
            onError: (error) => {
              errors.push(error);
            },
          }
        )
      );
      const request = remove.mutate({ id: signupA.id });
      await vi.waitFor(() => {
        expect(
          testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupA))
        ).toEqual([]);
      });
      failure.resolve(new Response(null, { status: 500 }));
      await expect(request).rejects.toBeDefined();

      expect(
        testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupA))
      ).toEqual([signupA]);
      expect(
        testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupB))
      ).toEqual([signupB]);
      expect(errors).toHaveLength(1);
      remove.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("preserves the latest optimistic state when rapid removals overlap", async () => {
    const firstSignup = makeSignup(1);
    const secondSignup = makeSignup(2);
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const transport = makeAuctionTransport({
      remove: [firstResponse.promise, secondResponse.promise],
    });
    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(auctionSignupsQueryKey(groupA), [
      firstSignup,
      secondSignup,
    ]);
    const remove = new MutationObserver(
      testClient.queryClient,
      removeAuctionSignupMutationOptions(
        testClient.queryClient,
        groupA,
        transport.runner
      )
    );

    try {
      const firstRequest = remove.mutate({ id: firstSignup.id });
      await vi.waitFor(() => {
        expect(
          testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupA))
        ).toEqual([secondSignup]);
      });
      const secondRequest = remove.mutate({ id: secondSignup.id });
      await vi.waitFor(() => {
        expect(
          testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupA))
        ).toEqual([]);
      });

      firstResponse.resolve(new Response(null, { status: 500 }));
      await expect(firstRequest).rejects.toBeDefined();
      expect(
        testClient.queryClient.getQueryData(auctionSignupsQueryKey(groupA))
      ).toEqual([firstSignup]);

      secondResponse.resolve(jsonResponse({ success: true }));
      await expect(secondRequest).resolves.toEqual({ success: true });
      remove.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("does not let a delayed read overwrite an optimistic removal", async () => {
    const signup = makeSignup(1);
    const delayedRead = deferred<readonly AuctionSignup[]>();
    const transport = makeAuctionTransport({
      remove: [jsonResponse({ success: true })],
    });
    const testClient = makeTestQueryClient();
    const queryKey = auctionSignupsQueryKey(groupA);
    testClient.queryClient.setQueryData(queryKey, [signup]);
    const read = testClient.queryClient.query({
      queryFn: async () => await delayedRead.promise,
      queryKey,
      retry: false,
      staleTime: 0,
    });

    try {
      await vi.waitFor(() => {
        expect(
          testClient.queryClient.getQueryState(queryKey)?.fetchStatus
        ).toBe("fetching");
      });
      const remove = new MutationObserver(
        testClient.queryClient,
        removeAuctionSignupMutationOptions(
          testClient.queryClient,
          groupA,
          transport.runner
        )
      );
      await remove.mutate({ id: signup.id });
      delayedRead.resolve([signup]);
      await read;

      expect(testClient.queryClient.getQueryData(queryKey)).toEqual([]);
      remove.reset();
    } finally {
      testClient.cleanup();
    }
  });
});
