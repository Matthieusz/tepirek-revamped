import { describe, expect, it } from "vitest";

import { EVENT_ICON_MAP, getEventIcon } from "./constants";

describe("event icon helpers", () => {
  it("falls back to the default calendar icon", () => {
    expect(getEventIcon()).toBe(EVENT_ICON_MAP.calendar);
    expect(getEventIcon(null)).toBe(EVENT_ICON_MAP.calendar);
    expect(getEventIcon("dragon")).toBe(EVENT_ICON_MAP.calendar);
  });
});
