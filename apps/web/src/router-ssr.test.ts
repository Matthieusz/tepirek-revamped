// @vitest-environment node

import { dehydrate } from "@tanstack/react-query";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { expect, it, onTestFinished } from "vite-plus/test";

import {
  todosQueryKey,
  todosQueryOptions,
} from "@/features/todos/todo-queries";
import { AppHttpApiClient } from "@/lib/http-api-client-runtime";
import { makeTestAppEffectQuery } from "@/lib/test-utils/effect-query-test-utils";
import { getRouter } from "@/router";

const makeRequest = (userId: string) => {
  const router = getRouter();
  const { queryClient } = router.options.context;
  const todos = [{ completed: false, id: 1, text: "private task", userId }];

  const effectQuery = makeTestAppEffectQuery(
    Layer.effect(
      AppHttpApiClient,
      HttpApiClient.makeWith(AppHttpApi, {
        baseUrl: "http://localhost",
        httpClient: HttpClient.make((request) =>
          Effect.succeed(
            HttpClientResponse.fromWeb(request, Response.json(todos))
          )
        ),
      })
    )
  );

  onTestFinished(() => {
    queryClient.clear();
  });

  return { effectQuery, queryClient, router, todos };
};

it("isolates concurrent SSR query results and dehydration for the same key", async () => {
  const first = makeRequest("first-request");
  const second = makeRequest("second-request");
  expect(first.router.isServer).toBe(true);
  expect(second.router.isServer).toBe(true);

  await Promise.all([
    first.queryClient.query(todosQueryOptions(first.effectQuery)),
    second.queryClient.query(todosQueryOptions(second.effectQuery)),
  ]);

  expect(first.queryClient.getQueryData(todosQueryKey)).toEqual(first.todos);
  expect(second.queryClient.getQueryData(todosQueryKey)).toEqual(second.todos);
  expect(
    dehydrate(first.queryClient).queries.map((query) => query.state.data)
  ).toEqual([first.todos]);
  expect(
    dehydrate(second.queryClient).queries.map((query) => query.state.data)
  ).toEqual([second.todos]);

  await first.effectQuery.runtime.dispose();
  first.queryClient.clear();
  expect(second.queryClient.getQueryData(todosQueryKey)).toEqual(second.todos);
});
