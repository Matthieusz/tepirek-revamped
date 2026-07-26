import * as Predicate from "effect/Predicate";

import { formatProfession } from "../profession-presenters";

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
