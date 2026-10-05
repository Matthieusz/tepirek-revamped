import { Calendar } from "lucide-react";
import { describe, expect, it } from "vitest";

import { getEventIcon } from "./constants";

describe("event icon helpers", () => {
  it("falls back to the default calendar icon", () => {
    expect(getEventIcon()).toBe(Calendar);
    expect(getEventIcon(null)).toBe(Calendar);
    expect(getEventIcon("dragon")).toBe(Calendar);
  });
});
