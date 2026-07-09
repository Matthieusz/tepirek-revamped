/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import type { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import type { MargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.js";
import type { PendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.js";
import { AppHttpApi } from "../../../protocol/http-api-contract.js";
import type { SquadBuilderAccountRefetchError } from "../../../protocol/squad-builder/account-refetch/http-api-contract.js";
import {
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/account-refetch/http-api-contract.js";
import { Service as ApplyAccountRefetchService } from "../../../services/squad-builder/account-refetch/apply-account-refetch-service.js";
import type { ApplyAccountRefetchError } from "../../../services/squad-builder/account-refetch/apply-account-refetch.js";
import { Service as PreviewAccountRefetchService } from "../../../services/squad-builder/account-refetch/preview-account-refetch-service.js";
import type { PreviewAccountRefetchError } from "../../../services/squad-builder/account-refetch/preview-account-refetch.js";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.js";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountRefetchError>;

const toMargonemAccountId = (value: number): MargonemAccountId =>
  // SAFETY: HttpApi decoded this value with MargonemAccountIdSchema before the handler runs.
  value as MargonemAccountId;

const toPendingRefetchId = (value: number): PendingMargonemAccountRefetchId =>
  // SAFETY: HttpApi decoded this value with PendingMargonemAccountRefetchIdSchema before the handler runs.
  value as PendingMargonemAccountRefetchId;

const withRequestCorrelation = <A, E, R>(
  request: HttpServerRequest,
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> => {
  const requestId = request.headers["x-request-id"];

  if (requestId === undefined || requestId.length === 0) {
    return effect;
  }

  return effect.pipe(
    Effect.tap(() => Effect.annotateCurrentSpan("request.id", requestId))
  );
};

type AccountRefetchHandlerError =
  | PreviewAccountRefetchError
  | ApplyAccountRefetchError;

const mapAccountRefetchError = (
  error: AccountRefetchHandlerError
): ProtocolError => {
  switch (error._tag) {
    case "MargonemAccountNotFound":
    case "PendingMargonemAccountRefetchNotFound": {
      return new SquadBuilderNotFound({ message: error._tag });
    }
    case "ActorDoesNotOwnMargonemAccount": {
      return new SquadBuilderForbidden({
        message: "Actor does not own the account",
      });
    }
    case "MargonemProfileNameNotFound":
    case "MargonemCharacterRowsNotFound":
    case "MargonemCharacterRowInvalid": {
      return new SquadBuilderInvalidInput({ message: error._tag });
    }
    case "FirecrawlMonthlyBudgetExhausted":
    case "FirecrawlRequestFailed":
    case "FirecrawlResponseNotParseable":
    case "RequestCancelled": {
      return new SquadBuilderUpstreamUnavailable({ message: error._tag });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new SquadBuilderPersistenceUnavailable({
        cause: error.cause,
        operation: error.operation,
      });
    }
    default: {
      return new SquadBuilderUpstreamUnavailable({
        message: "Unreachable error tag",
      });
    }
  }
};

export const SquadBuilderAccountRefetchHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountRefetch",
  (handlers) =>
    Effect.gen(function* SquadBuilderAccountRefetchHttpApiHandlers() {
      const previewAccountRefetchSvc = yield* PreviewAccountRefetchService;
      const applyAccountRefetchSvc = yield* ApplyAccountRefetchService;

      return handlers
        .handle("previewAccountRefetch", ({ payload, request }) =>
          Effect.gen(function* previewAccountRefetchHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withRequestCorrelation(
              request,
              previewAccountRefetchSvc.preview({
                accountId: toMargonemAccountId(payload.accountId),
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(Effect.mapError(mapAccountRefetchError));
          })
        )
        .handle("applyAccountRefetch", ({ payload, request }) =>
          Effect.gen(function* applyAccountRefetchHandler() {
            const session = yield* requireSquadBuilderSession(request);
            return yield* withRequestCorrelation(
              request,
              applyAccountRefetchSvc.apply({
                actorUserId: sessionAppUserId(session),
                refetchPreviewId: toPendingRefetchId(payload.refetchPreviewId),
              })
            ).pipe(Effect.mapError(mapAccountRefetchError));
          })
        );
    })
);
