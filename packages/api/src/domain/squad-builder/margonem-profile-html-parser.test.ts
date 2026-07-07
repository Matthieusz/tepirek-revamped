import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it } from "vitest";

import { parseMargonemProfileHtml } from "./margonem-profile-html-parser.js";
import { parseMargonemProfileId } from "./margonem-profile-id.js";

const parseFixtureProfileId = () =>
  Effect.runSync(parseMargonemProfileId(7_298_897));

describe("Margonem profile HTML parser", () => {
  it("returns a typed parser failure when profile name is missing", () => {
    const exit = Effect.runSyncExit(
      parseMargonemProfileHtml({
        html: '<html><body><li class="char-row"></li></body></html>',
        profileId: parseFixtureProfileId(),
      })
    );

    expect(Exit.isFailure(exit)).toBe(true);
  });
});
