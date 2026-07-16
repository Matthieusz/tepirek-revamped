import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vitest";

import {
  parseSquadGroupListFilters,
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "./squad-group-list-filters.ts";

describe("parseSquadGroupListFilters", () => {
  it.effect(
    "parses missing squad group list filters as an unfiltered query",
    () =>
      Effect.gen(function* filtersEmpty() {
        const result = yield* parseSquadGroupListFilters({});
        expect(result).toEqual({ levelRange: { _tag: "AnyLevel" } });
      })
  );

  it.effect("trims and normalizes a valid squad group name query", () =>
    Effect.gen(function* filtersNameQuery() {
      const result = yield* parseSquadGroupListFilters({
        nameQuery: "  Smoki   jaruna ",
      });
      expect(result.nameQuery).toBeDefined();
      if (result.nameQuery === undefined) {
        return;
      }
      expect(squadGroupNameQueryToString(result.nameQuery)).toBe(
        "Smoki jaruna"
      );
    })
  );

  it.effect("rejects a one-character squad group name query", () =>
    Effect.gen(function* filtersRejectShortQuery() {
      const result = yield* parseSquadGroupListFilters({
        nameQuery: "a",
      }).pipe(Effect.flip);
      expect(result._tag).toBe("InvalidSquadGroupNameQuery");
    })
  );

  it.effect("rejects an overlong squad group name query", () =>
    Effect.gen(function* filtersRejectLongQuery() {
      const result = yield* parseSquadGroupListFilters({
        nameQuery: "a".repeat(81),
      }).pipe(Effect.flip);
      expect(result._tag).toBe("InvalidSquadGroupNameQuery");
    })
  );

  it.effect("parses an inclusive min and max level range", () =>
    Effect.gen(function* filtersBoundedRange() {
      const result = yield* parseSquadGroupListFilters({
        maxLevel: 180,
        minLevel: 120,
      });
      expect(result.levelRange._tag).toBe("BoundedLevelRange");
      if (result.levelRange._tag !== "BoundedLevelRange") {
        return;
      }
      if (
        result.levelRange.minLevel === undefined ||
        result.levelRange.maxLevel === undefined
      ) {
        return;
      }
      expect(squadGroupLevelBoundToNumber(result.levelRange.minLevel)).toBe(
        120
      );
      expect(squadGroupLevelBoundToNumber(result.levelRange.maxLevel)).toBe(
        180
      );
    })
  );

  it.effect("parses one-sided level ranges", () =>
    Effect.gen(function* filtersOneSidedRange() {
      const minResult = yield* parseSquadGroupListFilters({ minLevel: 120 });
      expect(minResult.levelRange._tag).toBe("BoundedLevelRange");

      const maxResult = yield* parseSquadGroupListFilters({ maxLevel: 180 });
      expect(maxResult.levelRange._tag).toBe("BoundedLevelRange");
    })
  );

  it.effect("rejects non-integer level bound", () =>
    Effect.gen(function* filtersRejectNonInteger() {
      const result = yield* parseSquadGroupListFilters({
        minLevel: 1.5,
      }).pipe(Effect.flip);
      expect(result._tag).toBe("InvalidSquadGroupLevelRange");
    })
  );

  it.effect("rejects out-of-policy min level bound", () =>
    Effect.gen(function* filtersRejectMinOutOfRange() {
      const result = yield* parseSquadGroupListFilters({
        minLevel: 0,
      }).pipe(Effect.flip);
      expect(result._tag).toBe("InvalidSquadGroupLevelRange");
    })
  );

  it.effect("rejects out-of-policy max level bound", () =>
    Effect.gen(function* filtersRejectMaxOutOfRange() {
      const result = yield* parseSquadGroupListFilters({
        maxLevel: 501,
      }).pipe(Effect.flip);
      expect(result._tag).toBe("InvalidSquadGroupLevelRange");
    })
  );

  it.effect("rejects reversed level range", () =>
    Effect.gen(function* filtersRejectReversed() {
      const result = yield* parseSquadGroupListFilters({
        maxLevel: 120,
        minLevel: 180,
      }).pipe(Effect.flip);
      expect(result._tag).toBe("InvalidSquadGroupLevelRange");
    })
  );
});
