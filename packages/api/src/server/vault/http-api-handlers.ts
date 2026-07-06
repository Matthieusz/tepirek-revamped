// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import { auth } from "@tepirek-revamped/auth";
import * as Effect from "effect/Effect";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { HeroBetLedger } from "../../modules/hero-bet-ledger.js";
import type { HeroBetLedgerError } from "../../modules/hero-bet-ledger.js";
import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  VaultBadRequest,
  VaultForbidden,
  VaultNotFound,
  VaultPersistenceUnavailable,
  VaultUnauthorized,
} from "../../protocol/vault/http-api-contract.js";

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

const classifyVaultFailure = (error: HeroBetLedgerError, operation: string) => {
  if (error._tag === "HeroBetLedgerBadRequest") {
    return new VaultBadRequest({ message: error.message });
  }
  if (error._tag === "HeroBetLedgerNotFound") {
    return new VaultNotFound({ message: error.message });
  }
  if (error._tag === "HeroBetLedgerPersistenceUnavailable") {
    return new VaultPersistenceUnavailable({
      cause: error.cause,
      operation: error.operation,
    });
  }
  return new VaultPersistenceUnavailable({ cause: error, operation });
};

const mapLedgerError = <A>(
  operation: string,
  effect: Effect.Effect<A, HeroBetLedgerError>
) =>
  effect.pipe(
    Effect.mapError((error) => classifyVaultFailure(error, operation))
  );

export const VaultHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "vault",
  (handlers) =>
    handlers
      .handle("distributeGold", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireAdminSession(request);
          return yield* mapLedgerError(
            "distributeGold",
            ledger.distributeGold(payload)
          );
        })
      )
      .handle("getUserStats", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getUserStats",
            ledger.getUserStats(payload.eventId)
          );
        })
      )
      .handle("getVault", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireVerifiedSession(request);
          return yield* mapLedgerError(
            "getVault",
            ledger.getVault(payload.eventId)
          );
        })
      )
      .handle("togglePaidOut", ({ payload, request }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const ledger = yield* HeroBetLedger;
          yield* requireAdminSession(request);
          return yield* mapLedgerError(
            "togglePaidOut",
            ledger.togglePaidOut(payload)
          );
        })
      )
);
