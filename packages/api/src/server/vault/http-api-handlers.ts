// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.js";
import {
  VaultBadRequest,
  VaultForbidden,
  VaultNotFound,
  VaultPersistenceUnavailable,
  VaultUnauthorized,
} from "../../protocol/vault/http-api-contract.js";
import type { VaultError } from "../../services/vault/vault-errors.js";
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { VaultService } from "../../services/vault/vault-service.js";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.js";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new VaultForbidden({ message: "FORBIDDEN" }),
    unauthorized: () => new VaultUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new VaultForbidden({
        message: "Konto oczekuje na weryfikację",
      }),
  }
);

const classifyVaultFailure = (error: VaultError, operation: string) => {
  if (error._tag === "VaultBadRequest") {
    return new VaultBadRequest({ message: error.message });
  }
  if (error._tag === "VaultNotFound") {
    return new VaultNotFound({ message: error.message });
  }
  if (error._tag === "VaultPersistenceUnavailable") {
    return new VaultPersistenceUnavailable({
      cause: error.cause,
      operation: error.operation,
    });
  }
  return new VaultPersistenceUnavailable({ cause: error, operation });
};

const mapVaultError = <A>(
  operation: string,
  effect: Effect.Effect<A, VaultError>
) =>
  effect.pipe(
    Effect.mapError((error) => classifyVaultFailure(error, operation))
  );

export const VaultHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "vault",
  (handlers) =>
    handlers
      .handle("distributeGold", ({ payload }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const vaultService = yield* VaultService;
          yield* requireAdminSession();
          return yield* mapVaultError(
            "distributeGold",
            vaultService.distributeGold(payload)
          );
        })
      )
      .handle("getUserStats", ({ payload }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const vaultService = yield* VaultService;
          yield* requireVerifiedSession();
          return yield* mapVaultError(
            "getUserStats",
            vaultService.getUserStats(payload.eventId)
          );
        })
      )
      .handle("getVault", ({ payload }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const vaultService = yield* VaultService;
          yield* requireVerifiedSession();
          return yield* mapVaultError(
            "getVault",
            vaultService.getVault(payload.eventId)
          );
        })
      )
      .handle("togglePaidOut", ({ payload }) =>
        Effect.gen(function* VaultHttpApiHandlers() {
          const vaultService = yield* VaultService;
          yield* requireAdminSession();
          return yield* mapVaultError(
            "togglePaidOut",
            vaultService.togglePaidOut(payload)
          );
        })
      )
);
