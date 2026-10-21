import { it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { HttpServer } from "effect/http";
import { HttpApi, HttpApiBuilder } from "effect/http-api";
import * as Layer from "effect/Layer";
import { describe, expect } from "vite-plus/test";

import { TodoId } from "../../domain/core-identifiers.ts";
import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import { CurrentSession } from "../../protocol/auth/current-session.ts";
import type { RequestSession } from "../../protocol/auth/current-session.ts";
import { SessionMiddleware } from "../../protocol/auth/http-api-middleware.ts";
import {
  TodoHttpApiGroup,
  TodoPersistenceUnavailable,
  TodoUnauthorized,
  TodoForbidden,
} from "../../protocol/todo/http-api-contract.ts";
import { ApplicationDependencyUnavailable } from "../../services/application-errors.ts";
import { TodoStore } from "../../services/todo/todo-store.ts";
import type {
  CreateTodoInput,
  DeleteTodoInput,
  ListTodosInput,
  ToggleTodoInput,
} from "../../services/todo/todo-store.ts";
import { integrationHandler } from "../../test/integration/http-handler.ts";
import { TodoHttpApiHandlers } from "./http-api-handlers.ts";

const userId = AppUserId.make("todo-user");

const id = TodoId.make(1);

const session: RequestSession = {
  session: {
    createdAt: new Date(0),
    expiresAt: new Date(1),
    id: "session-id",
    token: "test-token",
    updatedAt: new Date(0),
    userId,
  },
  user: {
    createdAt: new Date(0),
    email: "todo@example.com",
    emailVerified: true,
    id: userId,
    name: "Todo User",
    role: "user",
    updatedAt: new Date(0),
    verified: true,
  },
};

const todoApi = HttpApi.make("tepirekApi")
  .add(TodoHttpApiGroup)
  .middleware(SessionMiddleware);

const handlerLayer = (currentSession: RequestSession | null = session) =>
  HttpApiBuilder.layer(todoApi).pipe(
    Layer.provide(
      TodoHttpApiHandlers.pipe(
        Layer.provideMerge(
          Layer.succeed(
            SessionMiddleware,
            SessionMiddleware.of((effect) =>
              Effect.provideService(effect, CurrentSession, currentSession)
            )
          )
        )
      )
    ),
    Layer.provide(HttpServer.layerServices)
  );

const operations = [
  { name: "create", path: "/todos/", payload: { text: "Task" } },
  { name: "delete", path: "/todos/delete", payload: { id } },
  { name: "list", path: "/todos/", payload: null },
  { name: "toggle", path: "/todos/toggle", payload: { completed: true, id } },
] as const;

const request = (operation: (typeof operations)[number]) =>
  new Request(
    `http://localhost${operation.path}`,
    operation.payload === null
      ? { method: "GET" }
      : {
          body: JSON.stringify(operation.payload),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
  );

const summary = { completed: false, id, text: "Task", userId };

const unexpected = () => Effect.die("Persistence must not run");

describe("todo HTTP handlers", () => {
  it.effect(
    "passes actor-scoped inputs through the port under Todo operation spans",
    () =>
      Effect.gen(function* todoOperationsTest() {
        const calls: string[] = [];

        const record = (
          operation: (typeof operations)[number],
          input:
            | CreateTodoInput
            | DeleteTodoInput
            | ListTodosInput
            | ToggleTodoInput
        ) =>
          Effect.gen(function* recordOperation() {
            const span = yield* Effect.currentSpan.pipe(Effect.orDie);
            expect(span.name).toBe(`Todo.${operation.name}`);
            expect(input).toEqual({ ...operation.payload, userId });
            calls.push(operation.name);
          });

        const store = TodoStore.of({
          create: (input) => record(operations[0], input),
          delete: (input) => record(operations[1], input),
          list: (input) =>
            record(operations[2], input).pipe(Effect.as([summary])),
          toggle: (input) => record(operations[3], input),
        });

        const api = yield* integrationHandler(handlerLayer());

        for (const operation of operations) {
          const response = yield* Effect.promise(
            async () =>
              await api.handler(
                request(operation),
                Context.make(TodoStore, store)
              )
          );

          expect(response.status).toBeLessThan(300);

          if (operation.name === "list") {
            const body = yield* Effect.promise(
              async () => await response.text()
            );

            expect(body).toBe(JSON.stringify([summary]));
          }
        }

        expect(calls).toEqual(operations.map((operation) => operation.name));
      })
  );

  for (const operation of operations) {
    for (const actor of [
      {
        error: new TodoUnauthorized({ message: "UNAUTHORIZED" }),
        session: null,
      },
      {
        error: new TodoForbidden({ message: "Konto oczekuje na weryfikację" }),
        session: { ...session, user: { ...session.user, verified: false } },
      },
    ]) {
      it.effect(
        `${operation.name} returns ${actor.error._tag} before using persistence`,
        () =>
          Effect.gen(function* unauthorizedTodoTest() {
            const store = TodoStore.of({
              create: unexpected,
              delete: unexpected,
              list: unexpected,
              toggle: unexpected,
            });

            const api = yield* integrationHandler(handlerLayer(actor.session));

            const response = yield* Effect.promise(
              async () =>
                await api.handler(
                  request(operation),
                  Context.make(TodoStore, store)
                )
            );

            expect(response.ok).toBe(false);

            const body = yield* Effect.promise(
              async () => await response.text()
            );

            expect(body).toBe(JSON.stringify(actor.error));
          })
      );
    }

    it.effect(
      `${operation.name} projects persistence failures without exposing causes`,
      () =>
        Effect.gen(function* persistenceFailureTest() {
          const unavailable = () =>
            Effect.fail(
              new ApplicationDependencyUnavailable({
                cause: new Error("secret-database-details"),
                operation: operation.name,
              })
            );

          const store = TodoStore.of({
            create: unavailable,
            delete: unavailable,
            list: unavailable,
            toggle: unavailable,
          });

          const api = yield* integrationHandler(handlerLayer());

          const response = yield* Effect.promise(
            async () =>
              await api.handler(
                request(operation),
                Context.make(TodoStore, store)
              )
          );

          expect(response.status).toBe(500);
          const body = yield* Effect.promise(async () => await response.text());
          expect(body).toBe(
            JSON.stringify(
              new TodoPersistenceUnavailable({ operation: operation.name })
            )
          );
        })
    );
  }
});
