import {
  HttpApiBadRequestError,
  HttpApiConflictError,
  HttpApiError,
  HttpApiForbiddenError,
  HttpApiNotFoundError,
  HttpApiPersistenceUnavailableError,
  HttpApiUnauthorizedError,
  HttpApiUpstreamUnavailableError,
} from "@tepirek-revamped/api/protocol/http-api-errors";
import type { HttpApiError as HttpApiErrorType } from "@tepirek-revamped/api/protocol/http-api-errors";
import type { PreviewOwnedAccountImportsSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
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

  return fallbackErrorMessage;
};

/** Maps typed line failures returned inside a squad-builder success payload. */
export const getSquadBuilderLineErrorMessage = (
  error: SquadBuilderLineError
): string => {
  switch (error._tag) {
    case "DuplicateProfileInBatch": {
      return "Ten profil występuje na liście więcej niż raz.";
    }
    case "FirecrawlMonthlyBudgetExhausted": {
      return "Limit pobierania profili został wyczerpany. Spróbuj ponownie później.";
    }
    case "FirecrawlRequestFailed": {
      return "Nie udało się pobrać profilu Margonem.";
    }
    case "FirecrawlResponseNotParseable": {
      return "Nie udało się odczytać danych z profilu Margonem.";
    }
    case "InvalidMargonemProfileUrl": {
      return "Podaj poprawny link do profilu Margonem.";
    }
    case "MargonemAccountAlreadyOwnedByActor": {
      return "Możesz zarządzać tylko własnymi kontami.";
    }
    case "MargonemAccountAlreadySharedWithActor": {
      return "To konto jest już z Tobą współdzielone.";
    }
    case "MargonemAccountOwnedByAnotherUser": {
      return "To konto należy do innego użytkownika.";
    }
    case "MargonemCharacterRowInvalid": {
      return "Profil zawiera nieprawidłowe dane postaci.";
    }
    case "MargonemCharacterRowsNotFound": {
      return "Nie znaleziono postaci na tym profilu.";
    }
    case "MargonemProfileNameNotFound": {
      return "Nie znaleziono nazwy profilu Margonem.";
    }
    case "MissingMargonemProfileId": {
      return "Link nie zawiera identyfikatora profilu Margonem.";
    }
    case "SquadBuilderPersistenceUnavailable": {
      return "Nie udało się zapisać zmian kont i składów. Spróbuj ponownie później.";
    }
    default: {
      const exhaustive: never = error;
      return exhaustive;
    }
  }
};

/**
 * Converts errors at JavaScript and Promise boundaries into safe UI copy.
 * HTTP API errors are matched by their stable protocol tags and schemas.
 */
export const getErrorMessage = (
  error: CaughtError,
  fallback = fallbackErrorMessage
): string => {
  if (isApiError(error)) {
    return getApiErrorMessage(error);
  }

  if (error instanceof Error && error.name !== "RuntimeException") {
    return error.message;
  }

  return fallback;
};
