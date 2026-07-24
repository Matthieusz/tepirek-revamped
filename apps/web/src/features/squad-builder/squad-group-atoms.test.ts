import { describe, expect, it } from "vitest";

import {
  availableSquadCharactersAtom,
  saveSharedSquadGroupCharactersAtom,
  saveSquadGroupAtom,
  squadGroupDetailAtom,
} from "@/features/squad-builder/squad-group-atoms";
import {
  makeTestLayer,
  waitForAtomResults,
} from "@/lib/test-utils/atom-test-utils";

describe("squad group atoms", () => {
  it("does not mount group resources for invalid IDs", () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.mount(squadGroupDetailAtom({ groupId: 0 }));
    registry.mount(availableSquadCharactersAtom({ groupId: -1 }));
    expect(calls).toHaveLength(0);
  });

  it("preserves missing IDs and brands existing IDs in save payloads", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.set(saveSquadGroupAtom, {
      expectedUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
      groupId: 10,
      name: "Test group",
      squads: [
        {
          characters: [],
          clientKey: "new-squad",
          name: "New squad",
          position: 0,
        },
        {
          characters: [],
          clientKey: "existing-squad",
          name: "Existing squad",
          position: 1,
          squadId: 20,
        },
      ],
    });
    await waitForAtomResults(registry, [saveSquadGroupAtom]);

    const saveCall = calls.find((call) => call.method === "saveSquadGroup");
    expect(saveCall?.args).toEqual({
      expectedUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
      groupId: 10,
      name: "Test group",
      squads: [
        {
          characters: [],
          clientKey: "new-squad",
          name: "New squad",
          position: 0,
          squadId: undefined,
        },
        {
          characters: [],
          clientKey: "existing-squad",
          name: "Existing squad",
          position: 1,
          squadId: 20,
        },
      ],
    });
  });

  it("brands required squad IDs in shared save payloads", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.set(saveSharedSquadGroupCharactersAtom, {
      expectedUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
      groupId: 10,
      squads: [{ characters: [], squadId: 20 }],
    });
    await waitForAtomResults(registry, [saveSharedSquadGroupCharactersAtom]);

    const saveCall = calls.find(
      (call) => call.method === "saveSharedSquadGroupCharacters"
    );
    expect(saveCall?.args).toEqual({
      expectedUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
      groupId: 10,
      squads: [{ characters: [], squadId: 20 }],
    });
  });
});
