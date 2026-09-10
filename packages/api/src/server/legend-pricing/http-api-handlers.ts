/* eslint-disable promise/prefer-await-to-callbacks -- Effect Match handlers are synchronous pattern handlers, not Promise callbacks. */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../protocol/http-api-contract.ts";
import {
  LegendPricingConflict,
  LegendPricingForbidden,
  LegendPricingNotFound,
  LegendPricingPersistenceUnavailable,
  LegendPricingUnauthorized,
} from "../../protocol/legend-pricing/http-api-contract.ts";
import type {
  ApplicationConflict,
  ApplicationDependencyUnavailable,
  ApplicationNotFound,
} from "../../services/application-errors.ts";
import { LegendPricingStore } from "../../services/legend-pricing/legend-pricing-store.ts";
import { buildAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } =
  buildAuthorizationPolicy({
    forbidden: () => new LegendPricingForbidden({ message: "FORBIDDEN" }),
    unauthorized: () =>
      new LegendPricingUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new LegendPricingForbidden({ message: "Konto oczekuje na weryfikację" }),
  });

const mapLegendPricingError = (
  input:
    | ApplicationConflict
    | ApplicationDependencyUnavailable
    | ApplicationNotFound
) =>
  Match.value(input).pipe(
    Match.tag(
      "ApplicationConflict",
      (error) => new LegendPricingConflict({ message: error.message })
    ),
    Match.tag(
      "ApplicationNotFound",
      (error) => new LegendPricingNotFound({ message: error.message })
    ),
    Match.tag(
      "ApplicationDependencyUnavailable",
      (error) =>
        new LegendPricingPersistenceUnavailable({
          operation: error.operation,
        })
    ),
    Match.exhaustive
  );

/** HTTP handlers for verified legend-price reads and administrator updates. */
export const LegendPricingHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "legendPricing",
  (handlers) =>
    handlers
      .handle("listLegendPrices", () =>
        Effect.gen(function* listLegendPricesHandler() {
          yield* requireVerifiedSession();
          const store = yield* LegendPricingStore;

          return yield* store
            .list()
            .pipe(Effect.mapError(mapLegendPricingError));
        })
      )
      .handle("updateLegendCost", ({ payload }) =>
        Effect.gen(function* updateLegendCostHandler() {
          const session = yield* requireAdminSession();
          const store = yield* LegendPricingStore;

          return yield* store
            .updateCost({ ...payload, updatedBy: session.user.id })
            .pipe(Effect.mapError(mapLegendPricingError));
        })
      )
);
