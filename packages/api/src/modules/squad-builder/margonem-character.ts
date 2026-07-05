import * as Schema from "effect/Schema";

import type {
  MargonemCharacterId,
  PositiveLevel,
} from "./margonem-profile-id.js";
import { fail, success } from "./outcome.js";
import type { Outcome } from "./outcome.js";
import { PositiveInt } from "./positive-int.js";

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
): Outcome<MargonemWorld, UnknownMargonemWorld> => {
  if ((knownWorlds as readonly string[]).includes(value)) {
    return success(value as MargonemWorld);
  }

  return fail({ _tag: "UnknownMargonemWorld", value });
};

/** Normalized Margonem profession. */
export type MargonemProfession =
  | "warrior"
  | "paladin"
  | "bladeDancer"
  | "mage"
  | "hunter"
  | "tracker";

/** HTTP/API schema for a normalized Margonem profession. */
export const MargonemProfessionSchema = Schema.Literals([
  "warrior",
  "paladin",
  "bladeDancer",
  "mage",
  "hunter",
  "tracker",
]);

/** A Jaruna character parsed from a Margonem profile. */
export interface MargonemCharacterPreview {
  readonly characterId: MargonemCharacterId;
  readonly name: string;
  readonly level: PositiveLevel;
  readonly profession: MargonemProfession;
  readonly world: MargonemWorld;
  readonly avatarUrl: string | null;
}

/** HTTP/API schema for a Jaruna character parsed from a Margonem profile. */
export const MargonemCharacterPreviewSchema = Schema.Struct({
  avatarUrl: Schema.NullOr(Schema.String),
  characterId: PositiveInt,
  level: PositiveInt,
  name: Schema.String,
  profession: MargonemProfessionSchema,
  world: Schema.String,
});

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
): Outcome<MargonemProfession, UnknownMargonemProfession> => {
  const cleanLabel = cleanProfessionLabel(label);
  const profession = professionLabels[cleanLabel];

  if (profession === undefined) {
    return fail({ _tag: "UnknownMargonemProfession", label: cleanLabel });
  }

  return success(profession);
};
