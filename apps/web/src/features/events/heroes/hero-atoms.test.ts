import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { describe, expect, it } from "vitest";

import { heroesByEventAtom } from "@/features/events/heroes/hero-atoms";

describe("hero atoms", () => {
  it("heroesByEventAtom(null) returns a constant atom with a success of empty array - no API call", () => {
    const atom = heroesByEventAtom(null);
    const registry = AtomRegistry.make();

    const value = registry.get(atom);

    const expected = AsyncResult.success([]);
    expect(value).toMatchObject({
      _tag: expected._tag,
      value: expected.value,
      waiting: expected.waiting,
    });
  });

  it("heroesByEventAtom with a number returns a different atom than the null one", () => {
    const disabledAtom = heroesByEventAtom(null);
    const realAtom = heroesByEventAtom(5);

    expect(disabledAtom).not.toBe(realAtom);
  });

  it("uses the disabled atom for non-positive event IDs", () => {
    expect(heroesByEventAtom(0)).toBe(heroesByEventAtom(null));
    expect(heroesByEventAtom(-1)).toBe(heroesByEventAtom(null));
  });
});
