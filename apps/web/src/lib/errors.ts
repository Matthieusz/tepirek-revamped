import {
  AnnouncementForbidden,
  AnnouncementPersistenceUnavailable,
  AnnouncementUnauthorized,
} from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import type { AnnouncementError } from "@tepirek-revamped/api/protocol/announcement/http-api-contract";
import {
  AuctionForbidden,
  AuctionPersistenceUnavailable,
  AuctionUnauthorized,
} from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import type { AuctionError } from "@tepirek-revamped/api/protocol/auction/http-api-contract";
import {
  BetBadRequest,
  BetForbidden,
  BetNotFound,
  BetPersistenceUnavailable,
  BetUnauthorized,
} from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import type { BetError } from "@tepirek-revamped/api/protocol/bet/http-api-contract";
import {
  EventForbidden,
  EventPersistenceUnavailable,
  EventUnauthorized,
} from "@tepirek-revamped/api/protocol/event/http-api-contract";
import type { EventError } from "@tepirek-revamped/api/protocol/event/http-api-contract";
import {
  HeroesForbidden,
  HeroesPersistenceUnavailable,
  HeroesUnauthorized,
} from "@tepirek-revamped/api/protocol/heroes/http-api-contract";
import type { HeroesError } from "@tepirek-revamped/api/protocol/heroes/http-api-contract";
import {
  RankingForbidden,
  RankingPersistenceUnavailable,
  RankingUnauthorized,
} from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import type { RankingError } from "@tepirek-revamped/api/protocol/ranking/http-api-contract";
import {
  SkillsBadRequest,
  SkillsConflict,
  SkillsForbidden,
  SkillsPersistenceUnavailable,
  SkillsUnauthorized,
} from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import type { SkillsError } from "@tepirek-revamped/api/protocol/skills/http-api-contract";
import type { PreviewOwnedAccountImportsSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import {
  SquadBuilderConflict,
  SquadBuilderForbidden,
  SquadBuilderInvalidInput,
  SquadBuilderNotFound,
  SquadBuilderPersistenceUnavailable,
  SquadBuilderUnauthorized,
  SquadBuilderUpstreamUnavailable,
} from "@tepirek-revamped/api/protocol/squad-builder/errors";
import {
  TodoForbidden,
  TodoPersistenceUnavailable,
  TodoUnauthorized,
} from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import type { TodoError } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import {
  UserBadRequest,
  UserForbidden,
  UserNotFound,
  UserPersistenceUnavailable,
  UserUnauthorized,
} from "@tepirek-revamped/api/protocol/user/http-api-contract";
import type { UserError } from "@tepirek-revamped/api/protocol/user/http-api-contract";
import {
  VaultBadRequest,
  VaultForbidden,
  VaultNotFound,
  VaultPersistenceUnavailable,
  VaultUnauthorized,
} from "@tepirek-revamped/api/protocol/vault/http-api-contract";
import type { VaultError } from "@tepirek-revamped/api/protocol/vault/http-api-contract";

const fallbackErrorMessage = "Wystąpił błąd. Spróbuj ponownie później.";
const forbiddenMessage = "Nie masz uprawnień do wykonania tej akcji.";
const unauthorizedMessage = "Zaloguj się ponownie, aby kontynuować.";
const notFoundMessage = "Nie znaleziono zasobu.";
const conflictMessage =
  "Nie można zapisać zmian, bo zasób został już zmieniony.";
const validationMessage = "Sprawdź dane i spróbuj ponownie.";

/** All tagged errors that may cross the typed HTTP API boundary. */
type ApiError =
  | typeof AnnouncementError.Type
  | typeof AuctionError.Type
  | typeof BetError.Type
  | typeof EventError.Type
  | typeof HeroesError.Type
  | typeof RankingError.Type
  | typeof SkillsError.Type
  | typeof TodoError.Type
  | typeof UserError.Type
  | typeof VaultError.Type
  | InstanceType<typeof SquadBuilderConflict>
  | InstanceType<typeof SquadBuilderForbidden>
  | InstanceType<typeof SquadBuilderInvalidInput>
  | InstanceType<typeof SquadBuilderNotFound>
  | InstanceType<typeof SquadBuilderPersistenceUnavailable>
  | InstanceType<typeof SquadBuilderUnauthorized>
  | InstanceType<typeof SquadBuilderUpstreamUnavailable>;

type PreviewOwnedAccountImportFailure = Extract<
  PreviewOwnedAccountImportsSuccess["items"][number],
  { readonly _tag: "PreviewFailed" }
>;

type SquadBuilderLineError = PreviewOwnedAccountImportFailure["error"];

const isUnauthorizedApiError = (error: unknown): boolean =>
  error instanceof AnnouncementUnauthorized ||
  error instanceof AuctionUnauthorized ||
  error instanceof BetUnauthorized ||
  error instanceof EventUnauthorized ||
  error instanceof HeroesUnauthorized ||
  error instanceof RankingUnauthorized ||
  error instanceof SkillsUnauthorized ||
  error instanceof TodoUnauthorized ||
  error instanceof UserUnauthorized ||
  error instanceof VaultUnauthorized ||
  error instanceof SquadBuilderUnauthorized;

const isForbiddenApiError = (error: unknown): boolean =>
  error instanceof AnnouncementForbidden ||
  error instanceof AuctionForbidden ||
  error instanceof BetForbidden ||
  error instanceof EventForbidden ||
  error instanceof HeroesForbidden ||
  error instanceof RankingForbidden ||
  error instanceof SkillsForbidden ||
  error instanceof TodoForbidden ||
  error instanceof UserForbidden ||
  error instanceof VaultForbidden ||
  error instanceof SquadBuilderForbidden;

const isBadRequestApiError = (error: unknown): boolean =>
  error instanceof BetBadRequest ||
  error instanceof SkillsBadRequest ||
  error instanceof UserBadRequest ||
  error instanceof VaultBadRequest;

const isConflictApiError = (error: unknown): boolean =>
  error instanceof SkillsConflict || error instanceof SquadBuilderConflict;

const isNotFoundApiError = (error: unknown): boolean =>
  error instanceof BetNotFound ||
  error instanceof UserNotFound ||
  error instanceof VaultNotFound ||
  error instanceof SquadBuilderNotFound;

const isPersistenceApiError = (error: unknown): boolean =>
  error instanceof AnnouncementPersistenceUnavailable ||
  error instanceof AuctionPersistenceUnavailable ||
  error instanceof BetPersistenceUnavailable ||
  error instanceof EventPersistenceUnavailable ||
  error instanceof HeroesPersistenceUnavailable ||
  error instanceof RankingPersistenceUnavailable ||
  error instanceof SkillsPersistenceUnavailable ||
  error instanceof TodoPersistenceUnavailable ||
  error instanceof UserPersistenceUnavailable ||
  error instanceof VaultPersistenceUnavailable ||
  error instanceof SquadBuilderPersistenceUnavailable;

const isApiError = (error: unknown): error is ApiError =>
  isUnauthorizedApiError(error) ||
  isForbiddenApiError(error) ||
  isBadRequestApiError(error) ||
  isConflictApiError(error) ||
  isNotFoundApiError(error) ||
  isPersistenceApiError(error) ||
  error instanceof SquadBuilderInvalidInput ||
  error instanceof SquadBuilderUpstreamUnavailable;

const publicMessage = (message: string, fallback: string): string =>
  message.length > 0 ? message : fallback;

/** Maps a decoded HTTP API error while its tagged error type is known. */
export const getApiErrorMessage = (error: ApiError): string => {
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

  if (error instanceof SquadBuilderInvalidInput) {
    return validationMessage;
  }

  if (error instanceof SquadBuilderUpstreamUnavailable) {
    return "Nie udało się pobrać danych z zewnętrznej usługi.";
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
 * HTTP API errors are already decoded and are matched by their concrete types.
 */
export const getErrorMessage = (
  error: unknown,
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
