import { describe, expect, it } from "vitest";

import {
  availableSquadCharactersQueryKey,
  squadGroupDetailQueryKey,
} from "@/features/squad-builder/squad-group-queries";

describe("squad group query keys", () => {
  it("keeps group resources disabled for invalid IDs", () => {
    expect(squadGroupDetailQueryKey(0)).toEqual(["squad-groups", "detail", 0]);
    expect(availableSquadCharactersQueryKey(-1)).toEqual([
      "squad-groups",
      "available-characters",
      -1,
    ]);
  });
});
