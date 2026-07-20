import * as Arr from "effect/Array";
import * as Predicate from "effect/Predicate";
import * as Str from "effect/String";

import { formatProfession } from "../profession-presenters";

export { formatProfession };

/** Returns the Polish label used for a changed character field. */
export const changeFieldLabel = (field: string): string => {
  switch (field) {
    case "name": {
      return "Nazwa";
    }
    case "level": {
      return "Poziom";
    }
    case "profession": {
      return "Profesja";
    }
    case "avatarUrl": {
      return "Avatar";
    }
    default: {
      return field;
    }
  }
};

/** Formats a refetch diff value for user-visible output. */
export const formatChangeValue = (value: string | number | null): string => {
  if (value === null) {
    return "brak";
  }

  return Predicate.isString(value) ? formatProfession(value) : String(value);
};

/** Derives at most two uppercase initials for an avatar fallback. */
export const userInitials = (name: string): string =>
  Arr.join(
    Arr.map(
      Arr.take(Arr.filter(Str.split(name, /\s+/u), Str.isNonEmpty), 2),
      (part) => part[0]?.toUpperCase() ?? ""
    ),
    ""
  );
