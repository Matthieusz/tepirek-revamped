import { describe, expect, it } from "vitest";

import { isFailure, isSuccess } from "./outcome.js";
import {
  parseSquadGroupListFilters,
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "./squad-group-list-filters.js";

describe("parseSquadGroupListFilters", () => {
  it("parses missing squad group list filters as an unfiltered query", () => {
    const result = parseSquadGroupListFilters({});

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) {
      throw new Error("Expected empty filters to parse");
    }

    expect(result.value).toEqual({ levelRange: { _tag: "AnyLevel" } });
  });

  it("trims and normalizes a valid squad group name query", () => {
    const result = parseSquadGroupListFilters({
      nameQuery: "  Smoki   jaruna ",
    });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) {
      throw new Error("Expected name query to parse");
    }

    expect(result.value.nameQuery).toBeDefined();
    if (result.value.nameQuery === undefined) {
      throw new Error("Expected parsed name query");
    }
    expect(squadGroupNameQueryToString(result.value.nameQuery)).toBe(
      "Smoki jaruna"
    );
  });

  it("rejects a one-character squad group name query", () => {
    const result = parseSquadGroupListFilters({ nameQuery: "a" });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) {
      throw new Error("Expected one-character name query to fail");
    }
    expect(result.error._tag).toBe("InvalidSquadGroupNameQuery");
  });

  it("rejects an overlong squad group name query", () => {
    const result = parseSquadGroupListFilters({ nameQuery: "a".repeat(81) });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) {
      throw new Error("Expected overlong name query to fail");
    }
    expect(result.error._tag).toBe("InvalidSquadGroupNameQuery");
  });

  it("parses an inclusive min and max level range", () => {
    const result = parseSquadGroupListFilters({ maxLevel: 180, minLevel: 120 });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) {
      throw new Error("Expected level range to parse");
    }

    expect(result.value.levelRange._tag).toBe("BoundedLevelRange");
    if (result.value.levelRange._tag !== "BoundedLevelRange") {
      throw new Error("Expected bounded range");
    }
    if (
      result.value.levelRange.minLevel === undefined ||
      result.value.levelRange.maxLevel === undefined
    ) {
      throw new Error("Expected two-sided range");
    }
    expect(squadGroupLevelBoundToNumber(result.value.levelRange.minLevel)).toBe(
      120
    );
    expect(squadGroupLevelBoundToNumber(result.value.levelRange.maxLevel)).toBe(
      180
    );
  });

  it("parses one-sided level ranges", () => {
    const minOnly = parseSquadGroupListFilters({ minLevel: 120 });
    const maxOnly = parseSquadGroupListFilters({ maxLevel: 180 });

    expect(isSuccess(minOnly)).toBe(true);
    expect(isSuccess(maxOnly)).toBe(true);
  });

  it("rejects non-integer, out-of-policy, or reversed level ranges", () => {
    expect(isFailure(parseSquadGroupListFilters({ minLevel: 1.5 }))).toBe(true);
    expect(isFailure(parseSquadGroupListFilters({ minLevel: 0 }))).toBe(true);
    expect(isFailure(parseSquadGroupListFilters({ maxLevel: 501 }))).toBe(true);
    expect(
      isFailure(parseSquadGroupListFilters({ maxLevel: 120, minLevel: 180 }))
    ).toBe(true);
  });
});
