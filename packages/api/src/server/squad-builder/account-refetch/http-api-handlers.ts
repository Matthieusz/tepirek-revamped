/* eslint-disable promise/prefer-await-to-callbacks -- Effect Match handlers are synchronous pattern handlers, not Promise callbacks. */
/* eslint-disable no-shadow -- Named Effect generators mirror handler names for traces. */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { AppHttpApi } from "../../../protocol/http-api-contract.ts";
import {
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderRateLimited,
  SquadBuilderUpstreamUnavailable,
} from "../../../protocol/squad-builder/errors.ts";
import { apply as applyAccountRefetchWorkflow } from "../../../services/squad-builder/account-refetch/apply-account-refetch-service.ts";
import type { ApplyAccountRefetchError } from "../../../services/squad-builder/account-refetch/apply-account-refetch-service.ts";
import { preview as previewAccountRefetchWorkflow } from "../../../services/squad-builder/account-refetch/preview-account-refetch-service.ts";
import type { PreviewAccountRefetchError } from "../../../services/squad-builder/account-refetch/preview-account-refetch-service.ts";
import {
  requireSquadBuilderSession,
  sessionAppUserId,
} from "../auth-helper.ts";
import { withRequestCorrelation } from "../request-correlation.ts";

type AccountRefetchHandlerError =
  | PreviewAccountRefetchError
  | ApplyAccountRefetchError;

type PreviewAccountRefetchProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderInvalidInput
  | SquadBuilderRateLimited
  | SquadBuilderUpstreamUnavailable
  | SquadBuilderPersistenceUnavailable;

type ApplyAccountRefetchProtocolError =
  | SquadBuilderNotFound
  | SquadBuilderForbidden
  | SquadBuilderPersistenceUnavailable;

function mapAccountRefetchError(
  error: ApplyAccountRefetchError
): ApplyAccountRefetchProtocolError;
function mapAccountRefetchError(
  error: PreviewAccountRefetchError
): PreviewAccountRefetchProtocolError;
function mapAccountRefetchError(
  error: AccountRefetchHandlerError
): PreviewAccountRefetchProtocolError {
  return Match.value(error).pipe(
    Match.tag(
      "MargonemAccountNotFound",
      "PendingMargonemAccountRefetchNotFound",
      (error) => new SquadBuilderNotFound({ message: error._tag })
    ),
    Match.tag(
      "ActorDoesNotOwnMargonemAccount",
      () =>
        new SquadBuilderForbidden({
          message: "Actor does not own the account",
        })
    ),
    Match.tag(
      "MargonemProfileNameNotFound",
      "MargonemCharacterRowsNotFound",
      "MargonemCharacterRowInvalid",
      (error) => new SquadBuilderInvalidInput({ message: error._tag })
    ),
    Match.tag(
      "FirecrawlUserMonthlyBudgetExhausted",
      (error) => new SquadBuilderRateLimited({ message: error._tag })
    ),
    Match.tag(
      "FirecrawlMonthlyBudgetExhausted",
      "FirecrawlRequestFailed",
      "FirecrawlResponseNotParseable",
      (error) => new SquadBuilderUpstreamUnavailable({ message: error._tag })
    ),
    Match.tag(
      "SquadBuilderPersistenceUnavailable",
      (error) =>
        new SquadBuilderPersistenceUnavailable({
          operation: error.operation,
        })
    ),
    Match.exhaustive
  );
}

const mapPreviewAccountRefetchError = (
  error: PreviewAccountRefetchError
): PreviewAccountRefetchProtocolError => mapAccountRefetchError(error);

const mapApplyAccountRefetchError = (
  error: ApplyAccountRefetchError
): ApplyAccountRefetchProtocolError => mapAccountRefetchError(error);

export const SquadBuilderAccountRefetchHttpApiHandlers = HttpApiBuilder.group(
  AppHttpApi,
  "squadBuilderAccountRefetch",
  (handlers) =>
    handlers
      .handle(
        "previewAccountRefetch",
        Effect.fn("SquadBuilderAccountRefetch.previewAccountRefetch")(
          function* previewAccountRefetch({ payload, request }) {
            const session = yield* requireSquadBuilderSession();

            return yield* withRequestCorrelation(
              request,
              previewAccountRefetchWorkflow({
                accountId: payload.accountId,
                actorUserId: sessionAppUserId(session),
              })
            ).pipe(Effect.mapError(mapPreviewAccountRefetchError));
          }
        )
      )
      .handle(
        "applyAccountRefetch",
        Effect.fn("SquadBuilderAccountRefetch.applyAccountRefetch")(
          function* applyAccountRefetch({ payload, request }) {
            const session = yield* requireSquadBuilderSession();

            return yield* withRequestCorrelation(
              request,
              applyAccountRefetchWorkflow({
                actorUserId: sessionAppUserId(session),
                refetchPreviewId: payload.refetchPreviewId,
              })
            ).pipe(Effect.mapError(mapApplyAccountRefetchError));
          }
        )
      )
);
