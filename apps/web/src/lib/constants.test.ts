import { Calendar04Icon } from "@hugeicons/core-free-icons";
import { describe, expect, it } from "vitest";

import { getEventIcon } from "./constants";

describe("event icon helpers", () => {
  it("falls back to the default calendar icon", () => {
    expect(getEventIcon()).toBe(Calendar04Icon);
    expect(getEventIcon(null)).toBe(Calendar04Icon);
    expect(getEventIcon("dragon")).toBe(Calendar04Icon);
  });
});
