import { MutationObserver } from "@tanstack/react-query";
import { AppHttpApi } from "@tepirek-revamped/api/protocol/http-api-contract";
import { Effect, Layer } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { describe, expect, it, vi } from "vitest";

import {
  AppHttpApiClient,
  makeAppHttpApiRunner,
} from "@/lib/http-api-client-runtime";
import { makeTestQueryClient } from "@/lib/test-utils/query-test-utils";

import {
  clearPrivateQueryCache,
  deleteUserMutationOptions,
  sessionQueryKey,
  sessionQueryOptions,
  updateProfileMutationOptions,
  userListQueryKey,
  usersQueryKey,
  verifiedUsersQueryKey,
  verifyDiscordGuildMembershipMutationOptions,
} from "./user-queries";

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

const sessionBody = (userId: string, name: string) => ({
  session: {
    createdAt: "2026-01-01T00:00:00.000Z",
    expiresAt: "2026-01-02T00:00:00.000Z",
    id: `session-${userId}`,
    updatedAt: "2026-01-01T00:00:00.000Z",
    userId,
  },
  user: {
    createdAt: "2026-01-01T00:00:00.000Z",
    email: `${userId}@example.com`,
    emailVerified: true,
    id: userId,
    image: null,
    name,
    role: "user",
    updatedAt: "2026-01-01T00:00:00.000Z",
    verified: true,
  },
});

interface UserTransport {
  readonly calls: Record<string, number>;
  readonly runner: ReturnType<typeof makeAppHttpApiRunner>;
}

type PlannedResponse = Response | Promise<Response>;

type UserOperation =
  | "delete"
  | "profile"
  | "role"
  | "session"
  | "set-verified"
  | "users"
  | "verified"
  | "verify-discord";

const makeUserTransport = (plans: {
  readonly delete?: PlannedResponse[];
  readonly profile?: PlannedResponse[];
  readonly role?: PlannedResponse[];
  readonly session?: PlannedResponse[];
  readonly setVerified?: PlannedResponse[];
  readonly users?: PlannedResponse[];
  readonly verified?: PlannedResponse[];
  readonly verifyDiscord?: PlannedResponse[];
}): UserTransport => {
  const queues = {
    delete: [...(plans.delete ?? [])],
    profile: [...(plans.profile ?? [])],
    role: [...(plans.role ?? [])],
    session: [...(plans.session ?? [])],
    "set-verified": [...(plans.setVerified ?? [])],
    users: [...(plans.users ?? [])],
    verified: [...(plans.verified ?? [])],
    "verify-discord": [...(plans.verifyDiscord ?? [])],
  } satisfies Record<UserOperation, PlannedResponse[]>;
  const calls = {
    delete: 0,
    profile: 0,
    role: 0,
    session: 0,
    "set-verified": 0,
    users: 0,
    verified: 0,
    "verify-discord": 0,
  } satisfies Record<UserOperation, number>;

  const httpClient = HttpClient.make((request, url) => {
    let operation: UserOperation;
    if (url.pathname.endsWith("/session")) {
      operation = "session";
    } else if (url.pathname.endsWith("/verified")) {
      operation = "verified";
    } else if (url.pathname.endsWith("/profile")) {
      operation = "profile";
    } else if (url.pathname.endsWith("/set-verified")) {
      operation = "set-verified";
    } else if (url.pathname.endsWith("/set-role")) {
      operation = "role";
    } else if (url.pathname.endsWith("/delete")) {
      operation = "delete";
    } else if (url.pathname.endsWith("/verify-discord-guild-membership")) {
      operation = "verify-discord";
    } else {
      operation = "users";
    }

    calls[operation] += 1;
    const planned = queues[operation].shift();
    if (planned === undefined) {
      return Effect.die(new Error(`No planned response for user ${operation}`));
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

type JsonBody =
  | boolean
  | null
  | number
  | string
  | readonly JsonBody[]
  | { readonly [key: string]: JsonBody };

const jsonResponse = (body: JsonBody, status = 200): Response =>
  Response.json(body, { status });

const voidUserResponse = (): Response => jsonResponse(null);

describe("user queries", () => {
  it("loads a session for the active QueryClient", async () => {
    const transport = makeUserTransport({
      session: [jsonResponse(sessionBody("user-1", "First user"))],
    });
    const testClient = makeTestQueryClient();

    try {
      const session = await testClient.queryClient.query(
        sessionQueryOptions(transport.runner)
      );

      expect(session.user.name).toBe("First user");
      expect(transport.calls.session).toBe(1);
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates user data and route context after a profile change", async () => {
    const transport = makeUserTransport({ profile: [voidUserResponse()] });
    const testClient = makeTestQueryClient();
    const routeRefreshes: string[] = [];
    testClient.queryClient.setQueryData(
      sessionQueryKey,
      sessionBody("user-1", "Old name")
    );
    testClient.queryClient.setQueryData(userListQueryKey, []);
    testClient.queryClient.setQueryData(verifiedUsersQueryKey, []);

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        updateProfileMutationOptions(testClient.queryClient, transport.runner, {
          onRouteContextRefresh: async () => {
            routeRefreshes.push("refreshed");
            await Promise.resolve();
          },
        })
      );

      await mutation.mutate({ name: "New name" });

      expect(routeRefreshes).toEqual(["refreshed"]);
      expect(
        testClient.queryClient.getQueryState(sessionQueryKey)?.isInvalidated
      ).toBe(true);
      expect(
        testClient.queryClient.getQueryState(userListQueryKey)?.isInvalidated
      ).toBe(true);
      expect(
        testClient.queryClient.getQueryState(verifiedUsersQueryKey)
          ?.isInvalidated
      ).toBe(true);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("invalidates the session and route context after Discord verification", async () => {
    const transport = makeUserTransport({
      verifyDiscord: [jsonResponse({ valid: true })],
    });
    const testClient = makeTestQueryClient();
    const routeRefreshes: string[] = [];
    testClient.queryClient.setQueryData(
      sessionQueryKey,
      sessionBody("user-1", "User")
    );
    testClient.queryClient.setQueryData(userListQueryKey, []);
    testClient.queryClient.setQueryData(verifiedUsersQueryKey, []);

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        verifyDiscordGuildMembershipMutationOptions(
          testClient.queryClient,
          transport.runner,
          {
            onRouteContextRefresh: async () => {
              routeRefreshes.push("refreshed");
              await Promise.resolve();
            },
          }
        )
      );

      await expect(mutation.mutate()).resolves.toEqual({ valid: true });

      expect(routeRefreshes).toEqual(["refreshed"]);
      expect(
        testClient.queryClient.getQueryState(sessionQueryKey)?.isInvalidated
      ).toBe(true);
      expect(
        testClient.queryClient.getQueryState(userListQueryKey)?.isInvalidated
      ).toBe(false);
      expect(
        testClient.queryClient.getQueryState(verifiedUsersQueryKey)
          ?.isInvalidated
      ).toBe(false);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("does not retry user-management mutations", async () => {
    const transport = makeUserTransport({
      delete: [new Response(null, { status: 500 })],
    });
    const testClient = makeTestQueryClient();

    try {
      const mutation = new MutationObserver(
        testClient.queryClient,
        deleteUserMutationOptions(testClient.queryClient, transport.runner)
      );

      await expect(mutation.mutate("user-1")).rejects.toBeDefined();
      expect(transport.calls.delete).toBe(1);
      mutation.reset();
    } finally {
      testClient.cleanup();
    }
  });

  it("cancels stale reads before a second user can use the cache", async () => {
    const staleResponse = deferred<Response>();
    let aborted = false;
    const testClient = makeTestQueryClient();
    const staleRead = testClient.queryClient.query({
      queryFn: async ({ signal }) =>
        // oxlint-disable-next-line promise/avoid-new -- this test needs a manually cancellable transport
        await new Promise<Response>((resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(
              new DOMException("The operation was aborted.", "AbortError")
            );
          });
          void staleResponse.promise.then(resolve);
        }),
      queryKey: sessionQueryKey,
      retry: false,
    });

    try {
      await vi.waitFor(() => {
        expect(
          testClient.queryClient.getQueryState(sessionQueryKey)?.fetchStatus
        ).toBe("fetching");
      });
      await clearPrivateQueryCache(testClient.queryClient);
      staleResponse.resolve(jsonResponse(sessionBody("user-1", "Old user")));

      await expect(staleRead).rejects.toBeDefined();
      expect(aborted).toBe(true);
      expect(
        testClient.queryClient.getQueryData(sessionQueryKey)
      ).toBeUndefined();

      const secondUser = makeUserTransport({
        session: [jsonResponse(sessionBody("user-2", "Second user"))],
      });
      await expect(
        testClient.queryClient.query(sessionQueryOptions(secondUser.runner))
      ).resolves.toMatchObject({ user: { id: "user-2" } });
      expect(secondUser.calls.session).toBe(1);
    } finally {
      testClient.cleanup();
    }
  });

  it("clears the full private cache before navigation", async () => {
    const testClient = makeTestQueryClient();
    testClient.queryClient.setQueryData(usersQueryKey, [{ id: "user-1" }]);

    try {
      await clearPrivateQueryCache(testClient.queryClient);

      expect(
        testClient.queryClient.getQueryData(usersQueryKey)
      ).toBeUndefined();
    } finally {
      testClient.cleanup();
    }
  });
});
