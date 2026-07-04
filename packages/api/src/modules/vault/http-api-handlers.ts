import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../http-api-contract.js";
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { AppError } from "../app-error.js";
import { heroBetLedger } from "../hero-bet-ledger.js";
import {
  VaultBadRequest,
  VaultForbidden,
  VaultNotFound,
  VaultPersistenceUnavailable,
  VaultUnauthorized,
} from "./http-api-contract.js";

const headersFromRequest = (request: HttpServerRequest): Headers => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
};

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;
const requireVerifiedSession = (
  request: HttpServerRequest
): Effect.Effect<NonNullable<Session>, VaultUnauthorized | VaultForbidden> =>
  Effect.gen(function* requireVerifiedSession() {
    const session = yield* Effect.promise(() =>
      auth.api.getSession({ headers: headersFromRequest(request) })
    );
    if (!session?.user) {
      return yield* new VaultUnauthorized({ message: "UNAUTHORIZED" });
    }
    if (session.user.verified !== true) {
      return yield* new VaultForbidden({
        message: "Konto oczekuje na weryfikację",
      });
    }
    return session;
  });
const requireAdminSession = (request: HttpServerRequest) =>
  Effect.gen(function* requireAdminSession() {
    const session = yield* requireVerifiedSession(request);
    if (session.user.role !== "admin") {
      return yield* new VaultForbidden({ message: "FORBIDDEN" });
    }
    return session;
  });

const classifyVaultFailure = (cause: unknown, operation: string) => {
  if (cause instanceof AppError) {
    if (cause.code === "BAD_REQUEST") {
      return new VaultBadRequest({ message: cause.message });
    }
    if (cause.code === "NOT_FOUND") {
      return new VaultNotFound({ message: cause.message });
    }
    if (cause.code === "FORBIDDEN") {
      return new VaultForbidden({ message: cause.message });
    }
  }
  return new VaultPersistenceUnavailable({ cause, operation });
};
const runLedger = <A>(operation: string, work: () => Promise<A>) =>
  Effect.tryPromise({
    catch: (cause) => classifyVaultFailure(cause, operation),
    try: work,
  });

export const VaultHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "vault",
  (handlers) =>
    handlers
      .handle("distributeGold", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          yield* requireAdminSession(request);
          return yield* runLedger("distributeGold", () =>
            heroBetLedger.distributeGold(payload)
          );
        })
      )
      .handle("getUserStats", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getUserStats", () =>
            heroBetLedger.getUserStats(payload.eventId)
          );
        })
      )
      .handle("getVault", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          yield* requireVerifiedSession(request);
          return yield* runLedger("getVault", () =>
            heroBetLedger.getVault(payload.eventId)
          );
        })
      )
      .handle("togglePaidOut", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          yield* requireAdminSession(request);
          return yield* runLedger("togglePaidOut", () =>
            heroBetLedger.togglePaidOut(payload)
          );
        })
      )
);
