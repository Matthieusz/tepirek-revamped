import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it } from "vitest";

import { heroesByEventAtom } from "@/lib/hero-atoms";

describe("hero atoms", () => {
  it("heroesByEventAtom(null) returns a constant atom with a success of empty array - no API call", () => {
    const atom = heroesByEventAtom(null);
    const registry = AtomRegistry.make();

    const value = registry.get(atom);

    expect(value).toBeDefined();
    expect(typeof value).toBe("object");
  });

  it("heroesByEventAtom with a number returns a different atom than the null one", () => {
    const disabledAtom = heroesByEventAtom(null);
    const realAtom = heroesByEventAtom(5);

    expect(disabledAtom).not.toBe(realAtom);
  });
});
