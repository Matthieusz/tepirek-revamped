import * as Effect from "effect/Effect";
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
import { makeAuthorizationPolicy } from "../auth/authorization-policy.ts";

const { requireAdminSession, requireVerifiedSession } = makeAuthorizationPolicy(
  {
    forbidden: () => new LegendPricingForbidden({ message: "FORBIDDEN" }),
    unauthorized: () =>
      new LegendPricingUnauthorized({ message: "UNAUTHORIZED" }),
    unverified: () =>
      new LegendPricingForbidden({ message: "Konto oczekuje na weryfikację" }),
  }
);

const mapLegendPricingError = (
  error:
    | ApplicationConflict
    | ApplicationDependencyUnavailable
    | ApplicationNotFound
) => {
  switch (error._tag) {
    case "ApplicationConflict": {
      return new LegendPricingConflict({ message: error.message });
    }
    case "ApplicationNotFound": {
      return new LegendPricingNotFound({ message: error.message });
    }
    case "ApplicationDependencyUnavailable": {
      return new LegendPricingPersistenceUnavailable({
        operation: error.operation,
      });
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

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
