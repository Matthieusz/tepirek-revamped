import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { describe } from "vitest";

import {
  classifyLegendaryEquipment,
  LegendaryEnemyId,
  LegendaryEnemyLevel,
  LegendaryItemId,
  LegendaryItemLevel,
  LegendCostVersion,
  LegendPriceGold,
  MargonemForumPostId,
  normalizeLegendaryEnemyIcon,
  normalizeLegendaryItemIcon,
} from "./legend-catalog.ts";

const positiveIntegerSchemas = [
  LegendaryEnemyId,
  LegendaryEnemyLevel,
  LegendaryItemId,
  LegendaryItemLevel,
  MargonemForumPostId,
] as const;

describe("legend catalog identifiers and levels", () => {
  it.effect("accept positive safe integers", () =>
    Effect.gen(function* acceptPositiveSafeIntegers() {
      for (const schema of positiveIntegerSchemas) {
        expect(yield* Schema.decodeEffect(schema)(123)).toBe(123);
      }
    })
  );

  it.effect("reject non-positive, fractional, and unsafe values", () =>
    Effect.gen(function* rejectInvalidValues() {
      for (const schema of positiveIntegerSchemas) {
        for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
          const error = yield* Schema.decodeEffect(schema)(value).pipe(
            Effect.flip
          );
          expect(error._tag).toBe("SchemaError");
        }
      }
    })
  );
});

describe("LegendCostVersion", () => {
  it.effect("accepts zero for an unpriced item and positive versions", () =>
    Effect.gen(function* acceptCostVersions() {
      expect(yield* Schema.decodeEffect(LegendCostVersion)(0)).toBe(0);
      expect(yield* Schema.decodeEffect(LegendCostVersion)(3)).toBe(3);
    })
  );

  it.effect("rejects fractional, negative, and unsafe versions", () =>
    Effect.gen(function* rejectInvalidCostVersions() {
      for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
        const error = yield* Schema.decodeEffect(LegendCostVersion)(value).pipe(
          Effect.flip
        );
        expect(error._tag).toBe("SchemaError");
      }
    })
  );
});

describe("LegendPriceGold", () => {
  it.effect("accepts non-negative whole gold values", () =>
    Effect.gen(function* acceptWholeGold() {
      expect(yield* Schema.decodeEffect(LegendPriceGold)(0)).toBe(0);
      expect(yield* Schema.decodeEffect(LegendPriceGold)(123_456)).toBe(
        123_456
      );
    })
  );

  it.effect("rejects negative, fractional, and unsafe prices", () =>
    Effect.gen(function* rejectInvalidPrices() {
      for (const value of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
        const error = yield* Schema.decodeEffect(LegendPriceGold)(value).pipe(
          Effect.flip
        );
        expect(error._tag).toBe("SchemaError");
      }
    })
  );
});

describe("Margonem CDN icon normalization", () => {
  it("normalizes protocol-relative URLs and removes query identity noise", () => {
    expect(
      Option.getOrNull(
        normalizeLegendaryItemIcon(
          "//micc.garmory-cdn.cloud//obrazki/itemy/pie/pierscien1319.gif?v=2"
        )
      )
    ).toEqual({
      sourceKey: "/obrazki/itemy/pie/pierscien1319.gif",
      url: "https://micc.garmory-cdn.cloud/obrazki/itemy/pie/pierscien1319.gif",
    });
    const enemyIcon = normalizeLegendaryEnemyIcon(
      "https://micc.garmory-cdn.cloud/obrazki/npc/her/domina.gif#preview"
    );
    expect(Option.getOrNull(enemyIcon)).toEqual({
      sourceKey: "/obrazki/npc/her/domina.gif",
      url: "https://micc.garmory-cdn.cloud/obrazki/npc/her/domina.gif",
    });
  });

  it("rejects external hosts, wrong icon kinds, and parent paths", () => {
    expect(
      Option.isNone(
        normalizeLegendaryItemIcon(
          "https://evil.example/obrazki/itemy/pie/ring.gif"
        )
      )
    ).toBe(true);
    expect(
      Option.isNone(
        normalizeLegendaryItemIcon(
          "https://micc.garmory-cdn.cloud/obrazki/npc/e2/enemy.gif"
        )
      )
    ).toBe(true);
    expect(
      Option.isNone(
        normalizeLegendaryEnemyIcon(
          "https://micc.garmory-cdn.cloud/obrazki/npc/../itemy/ring.gif"
        )
      )
    ).toBe(true);
  });
});

describe("classifyLegendaryEquipment", () => {
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const classify = (
    itemClass: number,
    options?: {
      readonly icon?: string;
      readonly rarity?: string | null;
      readonly statKeys?: readonly string[];
    }
  ) => {
    const icon = normalizeLegendaryItemIcon(
      options?.icon ??
        "https://micc.garmory-cdn.cloud/obrazki/itemy/pie/item.gif"
    );
    if (Option.isNone(icon)) {
      throw new Error("Test icon must be a supported item icon");
    }
    return Option.getOrNull(
      classifyLegendaryEquipment({
        iconSourceKey: icon.value.sourceKey,
        itemClass,
        rarity: options?.rarity ?? "legendary",
        statKeys: new Set(options?.statKeys),
      })
    );
  };

  it("maps every supported forum equipment class", () => {
    expect(
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((itemClass) =>
        classify(itemClass)
      )
    ).toEqual([
      "weapon",
      "weapon",
      "weapon",
      "weapon",
      "weapon",
      "weapon",
      "orb",
      "armor",
      "helmet",
      "boots",
      "gloves",
      "ring",
      "necklace",
      "shield",
    ]);
  });

  it("excludes non-legendary, unknown, rune, container, quest, and outfit items", () => {
    expect(classify(12, { rarity: "common" })).toBeNull();
    expect(classify(99)).toBeNull();
    expect(classify(12, { statKeys: ["runes"] })).toBeNull();
    expect(classify(12, { statKeys: ["lootbox2"] })).toBeNull();
    expect(classify(12, { statKeys: ["quest"] })).toBeNull();
    expect(
      classify(12, {
        icon: "https://micc.garmory-cdn.cloud/obrazki/itemy/out/legendary.gif",
      })
    ).toBeNull();
  });
});
