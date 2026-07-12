const fallbackErrorMessage = "Wystąpił błąd. Spróbuj ponownie później.";
const forbiddenMessage = "Nie masz uprawnień do wykonania tej akcji.";
const unauthorizedMessage = "Zaloguj się ponownie, aby kontynuować.";
const notFoundMessage = "Nie znaleziono zasobu.";
const conflictMessage =
  "Nie można zapisać zmian, bo zasób został już zmieniony.";
const validationMessage = "Sprawdź dane i spróbuj ponownie.";

const taggedFailureMessages: Readonly<Record<string, string>> = {
  AccountAccessInviteNotFound: "Nie znaleziono zaproszenia do konta.",
  AccountAccessTransitionNotAllowed:
    "Nie można już zmienić statusu tego zaproszenia.",
  ActorCannotEditSquadGroup: "Nie możesz edytować tej grupy składów.",
  ActorCannotViewSquadGroup: "Nie masz dostępu do tej grupy składów.",
  ActorDoesNotOwnMargonemAccount: "Możesz zarządzać tylko własnymi kontami.",
  ActorDoesNotOwnSquadGroup: "Możesz zarządzać tylko własnymi grupami składów.",
  ActorIsNotInviteRecipient:
    "To zaproszenie jest przypisane do innego użytkownika.",
  ActorIsNotSquadGroupInviteRecipient:
    "To zaproszenie do grupy jest przypisane do innego użytkownika.",
  CannotInviteSelf: "Nie możesz zaprosić samego siebie.",
  DuplicateProfileInBatchError:
    "Ten profil występuje na liście więcej niż raz.",
  EditorCannotChangeSquadStructure:
    "Edytor nie może zmieniać struktury składu w tej grupie.",
  EmptyProfileUrlBatch: "Wklej co najmniej jeden link do profilu.",
  FirecrawlRequestFailed: "Nie udało się pobrać profilu Margonem.",
  FirecrawlResponseNotParseable:
    "Nie udało się odczytać danych z profilu Margonem.",
  InvalidAccountInviteTargetQuery:
    "Wpisz co najmniej 2 znaki, aby wyszukać użytkownika.",
  InvalidMargonemProfileUrl: "Podaj poprawny link do profilu Margonem.",
  InvalidSquadGroupName: "Podaj poprawną nazwę grupy składów.",
  InviteTargetNotFound: "Nie znaleziono użytkownika do zaproszenia.",
  InviteTargetNotVerified: "Możesz zaprosić tylko zweryfikowanego użytkownika.",
  MargonemAccountNotFound: "Nie znaleziono konta Margonem.",
  MargonemCharacterRowInvalid: "Profil zawiera nieprawidłowe dane postaci.",
  MargonemCharacterRowsNotFound: "Nie znaleziono postaci na tym profilu.",
  MargonemProfileNameNotFound: "Nie znaleziono nazwy profilu Margonem.",
  MissingMargonemProfileId: "Link nie zawiera identyfikatora profilu Margonem.",
  PendingMargonemAccountImportNotFound:
    "Nie znaleziono oczekującego importu konta.",
  PendingMargonemAccountRefetchNotFound:
    "Nie znaleziono oczekującego odświeżenia konta.",
  SquadBuilderPersistenceUnavailable:
    "Nie udało się zapisać zmian kont i składów. Spróbuj ponownie później.",
  SquadCharacterNotAccessible: "Nie masz dostępu do tej postaci.",
  SquadEditorInviteTargetNotFound: "Nie znaleziono edytora do zaproszenia.",
  SquadEditorInviteTargetNotVerified:
    "Możesz zaprosić tylko zweryfikowanego edytora.",
  SquadGroupInvitationNotFound: "Nie znaleziono zaproszenia do grupy składów.",
  SquadGroupInvitationTransitionNotAllowed:
    "Nie można już zmienić statusu tego zaproszenia do grupy.",
  SquadGroupNotFound: "Nie znaleziono grupy składów.",
  SquadNotInGroup: "Ten skład nie należy do wybranej grupy.",
  TooManyProfileUrlsInBatch: "Wklej maksymalnie 20 linków do profili naraz.",
};

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
  const mappedMessage = taggedFailureMessages[failure._tag];
  if (mappedMessage !== undefined) {
    return mappedMessage;
  }

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

export const getErrorMessage = (
  error: unknown,
  fallback = fallbackErrorMessage
): string => {
  if (isTaggedFailure(error)) {
    return getTaggedErrorMessage(error);
  }

  if (error instanceof Error && error.name !== "RuntimeException") {
    return error.message;
  }

  return fallback;
};
