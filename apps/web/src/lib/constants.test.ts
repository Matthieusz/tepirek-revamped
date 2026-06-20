import { EVENT_ICON_IDS } from "@tepirek-revamped/config";
import { Calendar } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EVENT_ICON_MAP, getEventIcon } from "./constants";

describe("event icon helpers", () => {
  it("falls back to the default calendar icon", () => {
    expect(getEventIcon()).toBe(Calendar);
    expect(getEventIcon(null)).toBe(Calendar);
    expect(getEventIcon("dragon")).toBe(Calendar);
  });

  it("resolves every valid event icon id", () => {
    for (const eventIconId of EVENT_ICON_IDS) {
      expect(getEventIcon(eventIconId)).toBe(EVENT_ICON_MAP[eventIconId]);
    }
  });
});
