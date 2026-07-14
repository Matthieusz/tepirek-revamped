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

  return typeof value === "string" ? formatProfession(value) : String(value);
};

/** Derives at most two uppercase initials for an avatar fallback. */
export const userInitials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
