/* eslint-disable promise/prefer-await-to-callbacks -- Effect Match handlers are synchronous pattern handlers, not Promise callbacks. */
import {
  HttpApiBadRequestError,
  HttpApiConflictError,
  HttpApiError,
  HttpApiForbiddenError,
  HttpApiNotFoundError,
  HttpApiPersistenceUnavailableError,
  HttpApiRateLimitedError,
  HttpApiUnauthorizedError,
  HttpApiUpstreamUnavailableError,
} from "@tepirek-revamped/api/protocol/http-api-errors";
import type { HttpApiError as HttpApiErrorType } from "@tepirek-revamped/api/protocol/http-api-errors";
import type { PreviewOwnedAccountImportsSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";

const fallbackErrorMessage = "Wystąpił błąd. Spróbuj ponownie później.";

const forbiddenMessage = "Nie masz uprawnień do wykonania tej akcji.";

const unauthorizedMessage = "Zaloguj się ponownie, aby kontynuować.";

const notFoundMessage = "Nie znaleziono zasobu.";

const conflictMessage =
  "Nie można zapisać zmian, bo zasób został już zmieniony.";

const validationMessage = "Sprawdź dane i spróbuj ponownie.";

type PreviewOwnedAccountImportFailure = Extract<
  PreviewOwnedAccountImportsSuccess["items"][number],
  { readonly _tag: "PreviewFailed" }
>;

type SquadBuilderLineError = PreviewOwnedAccountImportFailure["error"];

const isUnauthorizedApiError = Schema.is(HttpApiUnauthorizedError);

const isForbiddenApiError = Schema.is(HttpApiForbiddenError);

const isBadRequestApiError = Schema.is(HttpApiBadRequestError);

const isConflictApiError = Schema.is(HttpApiConflictError);

const isNotFoundApiError = Schema.is(HttpApiNotFoundError);

const isPersistenceApiError = Schema.is(HttpApiPersistenceUnavailableError);

const isRateLimitedApiError = Schema.is(HttpApiRateLimitedError);

const isUpstreamUnavailableApiError = Schema.is(
  HttpApiUpstreamUnavailableError
);

const isApiError = Schema.is(HttpApiError);

/** Values accepted at the JavaScript exception boundary and narrowed below. */
export type CaughtError = Parameters<typeof isApiError>[0];

const publicMessage = (message: string, fallback: string): string =>
  message.length > 0 ? message : fallback;

/** Maps a decoded HTTP API error to semantic Polish UI copy. */
export const getApiErrorMessage = (error: HttpApiErrorType): string => {
  if (isUnauthorizedApiError(error)) {
    return unauthorizedMessage;
  }

  if (isForbiddenApiError(error)) {
    return forbiddenMessage;
  }

  if (isBadRequestApiError(error)) {
    return publicMessage(error.message, validationMessage);
  }

  if (isConflictApiError(error)) {
    return conflictMessage;
  }

  if (isNotFoundApiError(error)) {
    return notFoundMessage;
  }

  if (isUpstreamUnavailableApiError(error)) {
    return "Nie udało się pobrać danych z zewnętrznej usługi.";
  }

  if (isPersistenceApiError(error)) {
    return fallbackErrorMessage;
  }

  if (isRateLimitedApiError(error)) {
    return "Limit pobierania profili został wyczerpany. Spróbuj ponownie później.";
  }

  return fallbackErrorMessage;
};

/** Maps typed line failures returned inside a squad-builder success payload. */
export const getSquadBuilderLineErrorMessage = (
  error: SquadBuilderLineError
): string =>
  Match.value(error).pipe(
    Match.tag(
      "DuplicateProfileInBatch",
      () => "Ten profil występuje na liście więcej niż raz."
    ),
    Match.tag(
      "FirecrawlMonthlyBudgetExhausted",
      "FirecrawlUserMonthlyBudgetExhausted",
      () =>
        "Limit pobierania profili został wyczerpany. Spróbuj ponownie później."
    ),
    Match.tag(
      "FirecrawlRequestFailed",
      () => "Nie udało się pobrać profilu Margonem."
    ),
    Match.tag(
      "FirecrawlResponseNotParseable",
      () => "Nie udało się odczytać danych z profilu Margonem."
    ),
    Match.tag(
      "InvalidMargonemProfileUrl",
      () => "Podaj poprawny link do profilu Margonem."
    ),
    Match.tag(
      "MargonemAccountAlreadyOwnedByActor",
      () => "Możesz zarządzać tylko własnymi kontami."
    ),
    Match.tag(
      "MargonemAccountAlreadySharedWithActor",
      () => "To konto jest już z Tobą współdzielone."
    ),
    Match.tag(
      "MargonemAccountOwnedByAnotherUser",
      () => "To konto należy do innego użytkownika."
    ),
    Match.tag(
      "MargonemCharacterRowInvalid",
      () => "Profil zawiera nieprawidłowe dane postaci."
    ),
    Match.tag(
      "MargonemCharacterRowsNotFound",
      () => "Nie znaleziono postaci na tym profilu."
    ),
    Match.tag(
      "MargonemProfileNameNotFound",
      () => "Nie znaleziono nazwy profilu Margonem."
    ),
    Match.tag(
      "MissingMargonemProfileId",
      () => "Link nie zawiera identyfikatora profilu Margonem."
    ),
    Match.tag(
      "SquadBuilderPersistenceUnavailable",
      () =>
        "Nie udało się zapisać zmian kont i składów. Spróbuj ponownie później."
    ),
    Match.exhaustive
  );

/**
 * Converts errors at JavaScript and Promise boundaries into safe UI copy.
 * HTTP API errors are matched by their stable protocol tags and schemas.
 * Defects and unrecognised errors always use the supplied fallback.
 */
export const getErrorMessage = (
  error: CaughtError,
  fallback = fallbackErrorMessage
): string => {
  if (isApiError(error)) {
    return getApiErrorMessage(error);
  }

  return fallback;
};
