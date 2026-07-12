// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import * as Effect from "effect/Effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  VaultBadRequest,
  VaultForbidden,
  VaultNotFound,
  VaultPersistenceUnavailable,
  VaultUnauthorized,
} from "../../protocol/vault/http-api-contract.ts";
import type { VaultError } from "../../services/vault/vault-errors.ts";
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import { VaultService } from "../../services/vault/vault-service.ts";
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

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

const mapVaultError = <A>(
  operation: string,
  effect: Effect.Effect<A, VaultError>
) =>
  effect.pipe(
    Effect.catchTags({
      VaultBadRequest: (error) =>
        Effect.fail(new VaultBadRequest({ message: error.message })),
      VaultNotFound: (error) =>
        Effect.fail(new VaultNotFound({ message: error.message })),
      VaultPersistenceUnavailable: (error) =>
        Effect.logError("Vault persistence operation failed").pipe(
          Effect.annotateLogs({
            errorTag: error._tag,
            operation: error.operation,
          }),
          Effect.andThen(
            Effect.fail(new VaultPersistenceUnavailable({ operation }))
          )
        ),
    })
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
