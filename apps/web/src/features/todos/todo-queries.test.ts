import { MutationObserver, QueryObserver } from "@tanstack/react-query";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { TodoSummary } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import { Effect } from "effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { describe, expect, it, vi } from "vitest";

import type { Todo, TodoApiRunner } from "@/features/todos/todo-api";
import {
  createTodoMutationOptions,
  deleteTodoMutationOptions,
  todosQueryKey,
  todosQueryOptions,
  toggleTodoMutationOptions,
} from "@/features/todos/todo-queries";
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

  // oxlint-disable-next-line promise/avoid-new -- tests need a manually controlled response
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

const makeTodo = (id: number, completed = false, text = `todo ${id}`): Todo =>
  Schema.decodeSync(TodoSummary)({
    completed,
    id,
    text,
    userId: "user-1",
  });

const jsonResponse = (body: readonly Todo[], status = 200): Response =>
  Response.json(body, { status });

const voidResponse = (): Response => new Response(null, { status: 200 });

type PlannedResponse = Response | Promise<Response>;

interface TodoTransport {
  readonly calls: {
    create: number;
    delete: number;
    list: number;
    toggle: number;
  };
  readonly runner: TodoApiRunner;
}

const makeTodoTransport = (plans: {
  readonly create?: PlannedResponse[];
  readonly delete?: PlannedResponse[];
  readonly list?: PlannedResponse[];
  readonly toggle?: PlannedResponse[];
}): TodoTransport => {
  const queues = {
    create: [...(plans.create ?? [])],
    delete: [...(plans.delete ?? [])],
    list: [...(plans.list ?? [])],
    toggle: [...(plans.toggle ?? [])],
  };

  const calls = { create: 0, delete: 0, list: 0, toggle: 0 };

  const httpClient = HttpClient.make((request, url) => {
    let key: keyof typeof queues;

    if (url.pathname === "/todos" && request.method === "GET") {
      key = "list";
    } else if (url.pathname === "/todos" && request.method === "POST") {
      key = "create";
    } else if (url.pathname === "/todos/delete") {
      key = "delete";
    } else {
      key = "toggle";
    }

    calls[key] += 1;
    const planned = queues[key].shift();

    if (planned === undefined) {
      return Effect.die(new Error(`No planned response for todo ${key}`));
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

describe("todo queries and mutations", () => {
  it("loads through Query and invalidates the list after creating", async () => {
    const firstTodo = makeTodo(1);
    const secondTodo = makeTodo(2);

    const transport = makeTodoTransport({
      create: [voidResponse()],
      list: [jsonResponse([firstTodo]), jsonResponse([firstTodo, secondTodo])],
    });

    const testClient = makeTestQueryClient();

    const queryObserver = new QueryObserver(
      testClient.queryClient,
      todosQueryOptions(transport.runner)
    );

    const unsubscribe = queryObserver.subscribe(() => {});

    try {
      await queryObserver.refetch();

      const mutationObserver = new MutationObserver(
        testClient.queryClient,
        createTodoMutationOptions(testClient.queryClient, transport.runner)
      );

      await mutationObserver.mutate({ text: "new task" });

      expect(transport.calls).toMatchObject({ create: 1, list: 2 });
      expect(testClient.queryClient.getQueryData(todosQueryKey)).toEqual([
        firstTodo,
        secondTodo,
      ]);
      mutationObserver.reset();
    } finally {
      unsubscribe();
      testClient.cleanup();
    }
  });

  it("keeps a successful create successful when list refresh fails", async () => {
    const firstTodo = makeTodo(1);
    const refreshErrors: Error[] = [];

    const transport = makeTodoTransport({
      create: [voidResponse()],
      list: [jsonResponse([firstTodo]), new Response(null, { status: 503 })],
    });

    const testClient = makeTestQueryClient();

    const queryObserver = new QueryObserver(testClient.queryClient, {
      ...todosQueryOptions(transport.runner),
      retry: false,
    });

    const unsubscribe = queryObserver.subscribe(() => {});

    try {
      await queryObserver.refetch();

      const mutationObserver = new MutationObserver(
        testClient.queryClient,
        createTodoMutationOptions(testClient.queryClient, transport.runner, {
          onRefreshError: (error) => {
            refreshErrors.push(error);
          },
        })
      );

      await expect(mutationObserver.mutate({ text: "new task" })).resolves.toBe(
        undefined
      );

      expect(refreshErrors).toHaveLength(1);
      expect(mutationObserver.getCurrentResult().isSuccess).toBe(true);
      expect(queryObserver.getCurrentResult().data).toEqual([firstTodo]);
      mutationObserver.reset();
    } finally {
      unsubscribe();
      testClient.cleanup();
    }
  });

  it("rolls back failed toggle and delete mutations", async () => {
    const firstTodo = makeTodo(1);
    const secondTodo = makeTodo(2, true);

    const transport = makeTodoTransport({
      delete: [new Response(null, { status: 500 })],
      toggle: [new Response(null, { status: 500 })],
    });

    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(todosQueryKey, [firstTodo, secondTodo]);
    const errors: unknown[] = [];

    try {
      const toggleObserver = new MutationObserver(
        testClient.queryClient,
        toggleTodoMutationOptions(testClient.queryClient, transport.runner, {
          onError: (error) => {
            errors.push(error);
          },
        })
      );

      await expect(
        toggleObserver.mutate({ completed: true, id: firstTodo.id })
      ).rejects.toBeDefined();
      expect(testClient.queryClient.getQueryData(todosQueryKey)).toEqual([
        firstTodo,
        secondTodo,
      ]);

      const deleteObserver = new MutationObserver(
        testClient.queryClient,
        deleteTodoMutationOptions(testClient.queryClient, transport.runner, {
          onError: (error) => {
            errors.push(error);
          },
        })
      );

      await expect(
        deleteObserver.mutate({ id: firstTodo.id })
      ).rejects.toBeDefined();
      expect(testClient.queryClient.getQueryData(todosQueryKey)).toEqual([
        firstTodo,
        secondTodo,
      ]);
      expect(errors).toHaveLength(2);
      toggleObserver.reset();
      deleteObserver.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("preserves the latest optimistic state when the first rapid toggle fails", async () => {
    const firstResponse = deferred<Response>();
    const secondResponse = deferred<Response>();
    const firstTodo = makeTodo(1);

    const transport = makeTodoTransport({
      toggle: [firstResponse.promise, secondResponse.promise],
    });

    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(todosQueryKey, [firstTodo]);

    const mutationObserver = new MutationObserver(
      testClient.queryClient,
      toggleTodoMutationOptions(testClient.queryClient, transport.runner)
    );

    try {
      const firstMutation = mutationObserver.mutate({
        completed: true,
        id: firstTodo.id,
      });

      await vi.waitFor(() => {
        expect(transport.calls.toggle).toBe(1);
      });

      const secondMutation = mutationObserver.mutate({
        completed: false,
        id: firstTodo.id,
      });

      await vi.waitFor(() => {
        expect(transport.calls.toggle).toBe(2);
      });
      expect(
        testClient.queryClient.getQueryData<Todo[]>(todosQueryKey)
      ).toEqual([makeTodo(1, false)]);

      firstResponse.resolve(new Response(null, { status: 500 }));
      await expect(firstMutation).rejects.toBeDefined();
      expect(
        testClient.queryClient.getQueryData<Todo[]>(todosQueryKey)
      ).toEqual([makeTodo(1, false)]);

      secondResponse.resolve(voidResponse());
      await expect(secondMutation).resolves.toBeUndefined();
      mutationObserver.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("does not let a delayed read overwrite an optimistic toggle", async () => {
    const delayedList = deferred<Response>();
    const firstTodo = makeTodo(1);

    const transport = makeTodoTransport({
      list: [delayedList.promise],
      toggle: [voidResponse()],
    });

    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(todosQueryKey, [firstTodo]);

    const delayedRead = testClient.queryClient.query({
      ...todosQueryOptions(transport.runner),
      retry: false,
      staleTime: 0,
    });

    try {
      await vi.waitFor(() => {
        expect(transport.calls.list).toBe(1);
      });

      const mutationObserver = new MutationObserver(
        testClient.queryClient,
        toggleTodoMutationOptions(testClient.queryClient, transport.runner)
      );

      await mutationObserver.mutate({ completed: true, id: firstTodo.id });
      delayedList.resolve(jsonResponse([firstTodo]));
      await delayedRead;

      expect(
        testClient.queryClient.getQueryData<Todo[]>(todosQueryKey)
      ).toEqual([makeTodo(1, true)]);
      mutationObserver.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("keeps invalidation alive after the mutation observer is destroyed", async () => {
    const response = deferred<Response>();
    const firstTodo = makeTodo(1);
    const transport = makeTodoTransport({ toggle: [response.promise] });
    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(todosQueryKey, [firstTodo]);

    const mutationObserver = new MutationObserver(
      testClient.queryClient,
      toggleTodoMutationOptions(testClient.queryClient, transport.runner)
    );

    try {
      const mutation = mutationObserver.mutate({
        completed: true,
        id: firstTodo.id,
      });

      mutationObserver.reset();
      response.resolve(voidResponse());
      await expect(mutation).resolves.toBeUndefined();

      expect(
        testClient.queryClient.getQueryState(todosQueryKey)?.isInvalidated
      ).toBe(true);
    } finally {
      testClient.cleanup();
    }
  });

  it("does not share todo mutations between QueryClients", async () => {
    const firstTodo = makeTodo(1);
    const transport = makeTodoTransport({ toggle: [voidResponse()] });
    const firstClient = makeTestQueryClient();
    const secondClient = makeTestQueryClient();
    firstClient.queryClient.setQueryData(todosQueryKey, [firstTodo]);
    secondClient.queryClient.setQueryData(todosQueryKey, [firstTodo]);

    try {
      const mutationObserver = new MutationObserver(
        firstClient.queryClient,
        toggleTodoMutationOptions(firstClient.queryClient, transport.runner)
      );

      await mutationObserver.mutate({ completed: true, id: firstTodo.id });

      expect(
        firstClient.queryClient.getQueryData<Todo[]>(todosQueryKey)
      ).toEqual([makeTodo(1, true)]);
      expect(
        secondClient.queryClient.getQueryData<Todo[]>(todosQueryKey)
      ).toEqual([firstTodo]);
      mutationObserver.reset();
    } finally {
      firstClient.cleanup();
      secondClient.cleanup();
    }
  });
});
