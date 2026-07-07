import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import {
  parseSquadGroupListFilters,
  squadGroupLevelBoundToNumber,
  squadGroupNameQueryToString,
} from "./squad-group-list-filters.js";

describe("parseSquadGroupListFilters", () => {
  it("parses missing squad group list filters as an unfiltered query", () => {
    const exit = Effect.runSyncExit(parseSquadGroupListFilters({}));
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) {
      throw new Error("Expected empty filters to parse");
    }
    expect(exit.value).toEqual({ levelRange: { _tag: "AnyLevel" } });
  });

  it("trims and normalizes a valid squad group name query", () => {
    const exit = Effect.runSyncExit(
      parseSquadGroupListFilters({ nameQuery: "  Smoki   jaruna " })
    );
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) {
      throw new Error("Expected name query to parse");
    }
    expect(exit.value.nameQuery).toBeDefined();
    if (exit.value.nameQuery === undefined) {
      throw new Error("Expected parsed name query");
    }
    expect(squadGroupNameQueryToString(exit.value.nameQuery)).toBe(
      "Smoki jaruna"
    );
  });

  it("rejects a one-character squad group name query", () => {
    const exit = Effect.runSyncExit(
      parseSquadGroupListFilters({ nameQuery: "a" })
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("rejects an overlong squad group name query", () => {
    const exit = Effect.runSyncExit(
      parseSquadGroupListFilters({ nameQuery: "a".repeat(81) })
    );
    expect(Exit.isFailure(exit)).toBe(true);
  });

  it("parses an inclusive min and max level range", () => {
    const exit = Effect.runSyncExit(
      parseSquadGroupListFilters({ maxLevel: 180, minLevel: 120 })
    );
    expect(Exit.isSuccess(exit)).toBe(true);
    if (!Exit.isSuccess(exit)) {
      throw new Error("Expected level range to parse");
    }
    expect(exit.value.levelRange._tag).toBe("BoundedLevelRange");
    if (exit.value.levelRange._tag !== "BoundedLevelRange") {
      throw new Error("Expected bounded range");
    }
    if (
      exit.value.levelRange.minLevel === undefined ||
      exit.value.levelRange.maxLevel === undefined
    ) {
      throw new Error("Expected two-sided range");
    }
    expect(squadGroupLevelBoundToNumber(exit.value.levelRange.minLevel)).toBe(
      120
    );
    expect(squadGroupLevelBoundToNumber(exit.value.levelRange.maxLevel)).toBe(
      180
    );
  });

  it("parses one-sided level ranges", () => {
    const minExit = Effect.runSyncExit(
      parseSquadGroupListFilters({ minLevel: 120 })
    );
    const maxExit = Effect.runSyncExit(
      parseSquadGroupListFilters({ maxLevel: 180 })
    );
    expect(Exit.isSuccess(minExit)).toBe(true);
    expect(Exit.isSuccess(maxExit)).toBe(true);
  });

  it("rejects non-integer, out-of-policy, or reversed level ranges", () => {
    expect(
      Exit.isFailure(
        Effect.runSyncExit(parseSquadGroupListFilters({ minLevel: 1.5 }))
      )
    ).toBe(true);
    expect(
      Exit.isFailure(
        Effect.runSyncExit(parseSquadGroupListFilters({ minLevel: 0 }))
      )
    ).toBe(true);
    expect(
      Exit.isFailure(
        Effect.runSyncExit(parseSquadGroupListFilters({ maxLevel: 501 }))
      )
    ).toBe(true);
    expect(
      Exit.isFailure(
        Effect.runSyncExit(
          parseSquadGroupListFilters({ maxLevel: 120, minLevel: 180 })
        )
      )
    ).toBe(true);
  });
});
