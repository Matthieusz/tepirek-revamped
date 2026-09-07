import { QueryObserver } from "@tanstack/react-query";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";

import {
  AppHttpApiClient,
  makeAppHttpApiRunner,
} from "@/lib/http-api-client-runtime";
import { createQueryClient } from "@/lib/query-client";
import { makeHttpApiTestLayer } from "@/lib/test-utils/http-api-test-utils";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

const listTodos = Effect.gen(function* listTodosEffect() {
  const client = yield* AppHttpApiClient;
  return yield* client.todo.listTodos({});
});

const withTestQueryClient = async (
  test: (queryClient: ReturnType<typeof createQueryClient>) => Promise<void>
): Promise<void> => {
  const testClient = makeTestQueryClient();
  try {
    await test(testClient.queryClient);
  } finally {
    testClient.cleanup();
  }
};

describe("QueryClient", () => {
  it("declares cache, retry, and refetch policy", () => {
    const queryClient = createQueryClient();
    const defaults = queryClient.getDefaultOptions();

    expect(defaults.mutations?.retry).toBe(false);
    expect(defaults.queries).toMatchObject({
      gcTime: 5 * 60_000,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 30_000,
    });

    queryClient.clear();
  });

  it("keeps fresh data cached until stale time and then refetches", async () => {
    vi.useFakeTimers();
    try {
      await withTestQueryClient(async (queryClient) => {
        let requests = 0;
        const fetchValue = () => {
          requests += 1;
          return requests;
        };

        await queryClient.query({
          queryFn: fetchValue,
          queryKey: ["controlled-time"],
        });
        vi.advanceTimersByTime(29_999);
        await queryClient.query({
          queryFn: fetchValue,
          queryKey: ["controlled-time"],
        });
        expect(requests).toBe(1);

        vi.advanceTimersByTime(1);
        await queryClient.query({
          queryFn: fetchValue,
          queryKey: ["controlled-time"],
        });
        expect(requests).toBe(2);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes unused queries after the configured cache lifetime", async () => {
    vi.useFakeTimers();
    try {
      await withTestQueryClient(async (queryClient) => {
        const observer = new QueryObserver(queryClient, {
          queryFn: () => "cached",
          queryKey: ["garbage-collected"],
        });
        const unsubscribe = observer.subscribe((result) => {
          expect(result.status).toBeDefined();
        });
        await observer.refetch();
        unsubscribe();

        expect(queryClient.getQueryData(["garbage-collected"])).toBe("cached");
        vi.advanceTimersByTime(5 * 60_000);
        expect(queryClient.getQueryData(["garbage-collected"])).toBeUndefined();
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears query state through the test cleanup hook", async () => {
    const testClient = makeTestQueryClient();
    await testClient.queryClient.query({
      queryFn: () => "cached",
      queryKey: ["cleanup"],
    });

    expect(testClient.queryClient.getQueryCache().getAll()).toHaveLength(1);
    testClient.cleanup();
    expect(testClient.queryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it("uses the real HttpApiClient transport in Query tests", async () => {
    const { calls, layer } = makeHttpApiTestLayer();
    const runAppHttpApi = makeAppHttpApiRunner(layer);
    const testClient = makeTestQueryClient();

    try {
      const todos = await testClient.queryClient.query({
        queryFn: async ({ signal }) =>
          await runAppHttpApi(listTodos, { signal }),
        queryKey: ["todos"],
      });

      expect(todos).toEqual([]);
      expect(calls).toEqual([
        {
          args: {},
          group: "todo",
          method: "listTodos",
        },
      ]);
    } finally {
      testClient.cleanup();
    }
  });
});
