import { describe, expect, it } from "vitest";

import {
  getEventNamesById,
  getHeroEventName,
} from "@/routes/dashboard/events/-components/heroes-page";

describe("hero event names", () => {
  const eventNamesById = getEventNamesById([
    { id: 1, name: "Gwiazdka" },
    { id: 2, name: "Wielkanoc" },
  ]);

  it("looks up an event name by id", () => {
    expect(getHeroEventName(eventNamesById, 2)).toBe("Wielkanoc");
  });

  it.each([3, null, undefined])(
    "returns Brak for missing event id %s",
    (eventId) => {
      expect(getHeroEventName(eventNamesById, eventId)).toBe("Brak");
    }
  );
});
