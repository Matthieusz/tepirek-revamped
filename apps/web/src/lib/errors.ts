const fallbackErrorMessage = "Wystąpił błąd. Spróbuj ponownie później.";
const forbiddenMessage = "Nie masz uprawnień do wykonania tej akcji.";
const unauthorizedMessage = "Zaloguj się ponownie, aby kontynuować.";
const notFoundMessage = "Nie znaleziono zasobu.";
const conflictMessage =
  "Nie można zapisać zmian, bo zasób został już zmieniony.";
const validationMessage = "Sprawdź dane i spróbuj ponownie.";

type KnownTaggedFailure =
  | { readonly _tag: "BetBadRequest"; readonly message?: string }
  | { readonly _tag: "SkillsBadRequest"; readonly message?: string }
  | { readonly _tag: "UserBadRequest"; readonly message?: string }
  | { readonly _tag: "VaultBadRequest"; readonly message?: string }
  | { readonly _tag: "SkillsConflict"; readonly message?: string }
  | { readonly _tag: "BetNotFound"; readonly message?: string }
  | { readonly _tag: "UserNotFound"; readonly message?: string }
  | { readonly _tag: "VaultNotFound"; readonly message?: string };

interface TaggedFailure {
  readonly _tag: string;
  readonly message?: string;
}

const isTaggedFailure = (error: unknown): error is TaggedFailure =>
  typeof error === "object" &&
  error !== null &&
  "_tag" in error &&
  typeof error._tag === "string";

const publicMessage = (failure: TaggedFailure, fallback: string): string =>
  typeof failure.message === "string" && failure.message.length > 0
    ? failure.message
    : fallback;

const isKnownTaggedFailure = (
  failure: TaggedFailure
): failure is KnownTaggedFailure =>
  [
    "BetBadRequest",
    "SkillsBadRequest",
    "UserBadRequest",
    "VaultBadRequest",
    "SkillsConflict",
    "BetNotFound",
    "UserNotFound",
    "VaultNotFound",
  ].includes(failure._tag);

const getKnownTaggedErrorMessage = (failure: KnownTaggedFailure): string => {
  if (
    failure._tag === "BetBadRequest" ||
    failure._tag === "SkillsBadRequest" ||
    failure._tag === "UserBadRequest" ||
    failure._tag === "VaultBadRequest"
  ) {
    return publicMessage(failure, validationMessage);
  }

  if (failure._tag === "SkillsConflict") {
    return conflictMessage;
  }

  return notFoundMessage;
};

const getTaggedErrorMessage = (failure: TaggedFailure): string => {
  if (failure._tag.endsWith("Unauthorized")) {
    return unauthorizedMessage;
  }

  if (failure._tag.endsWith("Forbidden")) {
    return forbiddenMessage;
  }

  if (isKnownTaggedFailure(failure)) {
    return getKnownTaggedErrorMessage(failure);
  }

  return fallbackErrorMessage;
};

export const getErrorMessage = (error: unknown): string => {
  if (isTaggedFailure(error)) {
    return getTaggedErrorMessage(error);
  }

  if (error instanceof Error && error.name !== "RuntimeException") {
    return error.message;
  }

  return fallbackErrorMessage;
};
