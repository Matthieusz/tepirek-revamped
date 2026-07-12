import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type {
  MargonemCharacterId,
  PositiveLevel,
} from "./margonem-profile-id.ts";
import {
  MargonemCharacterIdSchema,
  PositiveLevelSchema,
} from "./margonem-profile-id.ts";

/** The only Margonem world supported by squad builder v1. */
export const MargonemWorld = Schema.Literal("jaruna");
export type MargonemWorld = typeof MargonemWorld.Type;

/** Expected failure when a world string is not a known Margonem world. */
export class UnknownMargonemWorld extends Schema.TaggedErrorClass<UnknownMargonemWorld>()(
  "UnknownMargonemWorld",
  {
    value: Schema.String,
  }
) {}

/** Parse a persisted world string into the domain world type. */
export const parseMargonemWorld = Effect.fn("MargonemWorld.parse")(
  function* parseMargonemWorld(value: string) {
    if (value === "jaruna") {
      return MargonemWorld.make(value);
    }

    return yield* new UnknownMargonemWorld({ value });
  }
);

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
  characterId: MargonemCharacterIdSchema,
  level: PositiveLevelSchema,
  name: Schema.String,
  profession: MargonemProfessionSchema,
  world: MargonemWorld,
});

/** Expected failure when a profession label cannot be normalized. */
// oxlint-disable-next-line max-classes-per-file -- closely related domain errors
export class UnknownMargonemProfession extends Schema.TaggedErrorClass<UnknownMargonemProfession>()(
  "UnknownMargonemProfession",
  {
    label: Schema.String,
  }
) {}

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
export const parseMargonemProfession = Effect.fn("MargonemProfession.parse")(
  function* parseMargonemProfession(label: string) {
    const cleanLabel = cleanProfessionLabel(label);
    const profession = professionLabels[cleanLabel];

    if (profession === undefined) {
      return yield* new UnknownMargonemProfession({ label: cleanLabel });
    }

    return profession;
  }
);
