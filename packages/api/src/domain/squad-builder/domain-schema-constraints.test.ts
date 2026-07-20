import { expect, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import { describe } from "vitest";

import { AccountDisplayName } from "./account-display-name.ts";
import { FirecrawlYearMonth } from "./firecrawl-year-month.ts";
import {
  SquadGroupLevelBound,
  SquadGroupNameQuery,
} from "./squad-group-list-filters.ts";
import { SquadGroupName, SquadName } from "./squad-name.ts";

describe("squad builder branded schema constraints", () => {
  it("normalizes names in schema constructors", () => {
    expect(Schema.decodeUnknownSync(AccountDisplayName)("  Konto  ")).toBe(
      "Konto"
    );
    expect(Schema.decodeUnknownSync(SquadGroupName)("  Grupa  ")).toBe("Grupa");
    expect(Schema.decodeUnknownSync(SquadName)("  Skład  ")).toBe("Skład");
    expect(
      Schema.decodeUnknownSync(SquadGroupNameQuery)("  Smoki   Jaruna  ")
    ).toBe("Smoki Jaruna");
  });

  it("rejects names outside their schema constraints", () => {
    expect(() => AccountDisplayName.make(" ")).toThrow();
    expect(() => SquadGroupName.make("x".repeat(81))).toThrow();
    expect(() => SquadName.make("")).toThrow();
    expect(() => SquadGroupNameQuery.make("a")).toThrow();
  });

  it("rejects level bounds outside their schema constraints", () => {
    expect(() => SquadGroupLevelBound.make(1.5)).toThrow();
    expect(() => SquadGroupLevelBound.make(0)).toThrow();
    expect(() => SquadGroupLevelBound.make(501)).toThrow();
  });

  it("rejects invalid Firecrawl year-month values in its schema", () => {
    expect(() => FirecrawlYearMonth.make("2025-1")).toThrow();
    expect(FirecrawlYearMonth.make("2025-01")).toBe("2025-01");
  });
});
