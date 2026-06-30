import type { MargonemCharacterId, PositiveLevel } from "./margonem-profile-id";
import { err, ok } from "./result";
import type { Result } from "./result";

/** The only Margonem world supported by squad builder v1. */
export type MargonemWorld = "jaruna";

/** Expected failure when a world string is not a known Margonem world. */
export interface UnknownMargonemWorld {
  readonly _tag: "UnknownMargonemWorld";
  readonly value: string;
}

const knownWorlds: readonly MargonemWorld[] = ["jaruna"];

/** Parse a persisted world string into the domain world type. */
export const parseMargonemWorld = (
  value: string
): Result<MargonemWorld, UnknownMargonemWorld> => {
  if ((knownWorlds as readonly string[]).includes(value)) {
    return ok(value as MargonemWorld);
  }

  return err({ _tag: "UnknownMargonemWorld", value });
};

/** Normalized Margonem profession. */
export type MargonemProfession =
  | "warrior"
  | "paladin"
  | "bladeDancer"
  | "mage"
  | "hunter"
  | "tracker";

/** A Jaruna character parsed from a Margonem profile. */
export interface MargonemCharacterPreview {
  readonly characterId: MargonemCharacterId;
  readonly name: string;
  readonly level: PositiveLevel;
  readonly profession: MargonemProfession;
  readonly world: MargonemWorld;
  readonly avatarUrl: string | null;
}

/** Expected failure when a profession label cannot be normalized. */
export interface UnknownMargonemProfession {
  readonly _tag: "UnknownMargonemProfession";
  readonly label: string;
}

const professionLabels: Readonly<Record<string, MargonemProfession>> = {
  Mag: "mage",
  Paladyn: "paladin",
  "Tancerz ostrzy": "bladeDancer",
  Tropiciel: "tracker",
  Wojownik: "warrior",
  bladeDancer: "bladeDancer",
  hunter: "hunter",
  mage: "mage",
  paladin: "paladin",
  tracker: "tracker",
  warrior: "warrior",
  Łowca: "hunter",
};

const cleanProfessionLabel = (label: string): string =>
  label.replace(/,$/u, "").trim();

/** Normalize a Polish Margonem profession label into the app domain value. */
export const parseMargonemProfession = (
  label: string
): Result<MargonemProfession, UnknownMargonemProfession> => {
  const cleanLabel = cleanProfessionLabel(label);
  const profession = professionLabels[cleanLabel];

  if (profession === undefined) {
    return err({ _tag: "UnknownMargonemProfession", label: cleanLabel });
  }

  return ok(profession);
};
