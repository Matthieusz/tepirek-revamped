/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks, promise/prefer-await-to-then, promise/valid-params -- Effect.catch uses callback pattern
import * as Effect from "effect/Effect";
import type * as Schema from "effect/Schema";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { parseMargonemAccountId } from "../../../domain/squad-builder/margonem-account-id.ts";
import { parsePendingMargonemAccountRefetchId } from "../../../domain/squad-builder/pending-margonem-account-refetch-id.ts";
import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import type { SquadBuilderAccountRefetchError } from "../../../protocol/squad-builder/account-refetch/http-api-contract.ts";
import {
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/account-refetch/http-api-contract.ts";
import { ApplyAccountRefetchService } from "../../../services/squad-builder/account-refetch/apply-account-refetch-service.ts";
import type { ApplyAccountRefetchError } from "../../../services/squad-builder/account-refetch/apply-account-refetch-service.ts";
import { PreviewAccountRefetchService } from "../../../services/squad-builder/account-refetch/preview-account-refetch-service.ts";
import type { PreviewAccountRefetchError } from "../../../services/squad-builder/account-refetch/preview-account-refetch-service.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type ProtocolError = Schema.Schema.Type<typeof SquadBuilderAccountRefetchError>;

const mapInvalidId = () =>
  new SquadBuilderInvalidInput({ message: "Invalid account refetch id" });

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
    case "FirecrawlResponseNotParseable": {
      return new SquadBuilderUpstreamUnavailable({ message: error._tag });
    }
    case "SquadBuilderPersistenceUnavailable": {
      return new SquadBuilderPersistenceUnavailable({
        operation: error.operation,
      });
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

export const SquadBuilderAccountRefetchHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountRefetch",
  Effect.fnUntraced(
    function* SquadBuilderAccountRefetchHttpApiHandlers(handlers) {
      const previewAccountRefetchSvc = yield* PreviewAccountRefetchService;
      const applyAccountRefetchSvc = yield* ApplyAccountRefetchService;

      return handlers
        .handle(
          "previewAccountRefetch",
          Effect.fn("SquadBuilderAccountRefetch.previewAccountRefetch")(
            function* previewAccountRefetch({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              const accountId = yield* parseMargonemAccountId(
                payload.accountId
              ).pipe(Effect.mapError(mapInvalidId));
              return yield* withRequestCorrelation(
                request,
                previewAccountRefetchSvc.preview({
                  accountId,
                  actorUserId: sessionAppUserId(session),
                })
              ).pipe(Effect.mapError(mapAccountRefetchError));
            }
          )
        )
        .handle(
          "applyAccountRefetch",
          Effect.fn("SquadBuilderAccountRefetch.applyAccountRefetch")(
            function* applyAccountRefetch({ payload, request }) {
              const session = yield* requireSquadBuilderSession();
              const refetchPreviewId =
                yield* parsePendingMargonemAccountRefetchId(
                  payload.refetchPreviewId
                ).pipe(Effect.mapError(mapInvalidId));
              return yield* withRequestCorrelation(
                request,
                applyAccountRefetchSvc.apply({
                  actorUserId: sessionAppUserId(session),
                  refetchPreviewId,
                })
              ).pipe(Effect.mapError(mapAccountRefetchError));
            }
          )
        );
    }
  )
);
