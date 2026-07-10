import { describe, expect, it } from "vitest";

import {
  saveSharedSquadGroupCharactersAtom,
  saveSquadGroupAtom,
} from "@/lib/squad-builder/squad-group-atoms";
import { flush, makeTestLayer } from "@/lib/test-utils/atom-test-utils";

describe("squad group atoms", () => {
  it("preserves missing IDs and brands existing IDs in save payloads", async () => {
    const { calls, makeRegistry } = makeTestLayer();
    const registry = makeRegistry();

    registry.set(saveSquadGroupAtom, {
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
    await flush();

    const saveCall = calls.find((call) => call.method === "saveSquadGroup");
    expect(saveCall?.args).toEqual({
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
      groupId: 10,
      squads: [{ characters: [], squadId: 20 }],
    });
    await flush();

    const saveCall = calls.find(
      (call) => call.method === "saveSharedSquadGroupCharacters"
    );
    expect(saveCall?.args).toEqual({
      groupId: 10,
      squads: [{ characters: [], squadId: 20 }],
    });
  });
});
