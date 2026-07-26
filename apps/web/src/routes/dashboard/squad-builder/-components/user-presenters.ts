import * as Arr from "effect/Array";
import * as Str from "effect/String";

/** Derives at most two uppercase initials for an avatar fallback. */
export const userInitials = (name: string): string =>
  Arr.join(
    Arr.map(
      Arr.take(Arr.filter(Str.split(name, /\s+/u), Str.isNonEmpty), 2),
      (part) => part[0]?.toUpperCase() ?? ""
    ),
    ""
  );
