import { describe, expect, it } from "vitest";

import {
  ALL_FILTER,
  isAllFilter,
  isHeroQueryEnabled,
  normalizeEventHeroFilter,
  selectEventUpdate,
  selectHeroUpdate,
  sortEventsByEndTimeDesc,
  sortHeroesByLevel,
  toQueryInput,
} from "./event-hero-filter";

describe("normalizeEventHeroFilter", () => {
  it("URL search wins over persisted filters", () => {
    const state = normalizeEventHeroFilter({
      persistedEventId: "2",
      persistedHeroId: "20",
      urlEventId: "1",
      urlHeroId: "10",
    });
    expect(state).toEqual({ eventId: "1", heroId: "10" });
  });

  it("missing URL search falls back to persisted filters", () => {
    const state = normalizeEventHeroFilter({
      persistedEventId: "2",
      persistedHeroId: "20",
      urlEventId: undefined,
      urlHeroId: undefined,
    });
    expect(state).toEqual({ eventId: "2", heroId: "20" });
  });

  it("missing both URL and persisted falls back to all Events and all Heroes", () => {
    const state = normalizeEventHeroFilter({
      persistedEventId: undefined,
      persistedHeroId: undefined,
      urlEventId: undefined,
      urlHeroId: undefined,
    });
    expect(state).toEqual({ eventId: ALL_FILTER, heroId: ALL_FILTER });
  });

  it("choosing all Events clears the Hero selection", () => {
    const state = normalizeEventHeroFilter({
      persistedEventId: ALL_FILTER,
      persistedHeroId: "20",
      urlEventId: undefined,
      urlHeroId: undefined,
    });
    expect(state).toEqual({ eventId: ALL_FILTER, heroId: ALL_FILTER });
  });

  it("URL all Events clears Hero even when a persisted Hero exists", () => {
    const state = normalizeEventHeroFilter({
      persistedEventId: "2",
      persistedHeroId: "20",
      urlEventId: ALL_FILTER,
      urlHeroId: undefined,
    });
    expect(state).toEqual({ eventId: ALL_FILTER, heroId: ALL_FILTER });
  });
});

describe("toQueryInput", () => {
  it("returns undefined for the all sentinel", () => {
    expect(toQueryInput(ALL_FILTER)).toBeUndefined();
  });

  it("returns a number for a selected id", () => {
    expect(toQueryInput("42")).toBe(42);
  });

  it("returns undefined for invalid numeric strings", () => {
    expect(toQueryInput("abc")).toBeUndefined();
  });
});

describe("isHeroQueryEnabled", () => {
  it("is disabled when all Events are selected", () => {
    expect(
      isHeroQueryEnabled({ eventId: ALL_FILTER, heroId: ALL_FILTER })
    ).toBe(false);
  });

  it("is enabled when a specific Event is selected", () => {
    expect(isHeroQueryEnabled({ eventId: "1", heroId: ALL_FILTER })).toBe(true);
  });
});

describe("selectEventUpdate", () => {
  it("clears Hero when choosing a specific Event", () => {
    expect(selectEventUpdate("1")).toEqual({
      eventId: "1",
      heroId: undefined,
    });
  });

  it("clears Hero when choosing all Events", () => {
    expect(selectEventUpdate(ALL_FILTER)).toEqual({
      eventId: undefined,
      heroId: undefined,
    });
  });
});

describe("selectHeroUpdate", () => {
  it("sets Hero when an Event is selected", () => {
    expect(
      selectHeroUpdate({ eventId: "1", heroId: ALL_FILTER }, "10")
    ).toEqual({ heroId: "10" });
  });

  it("clears Hero when all Events is selected", () => {
    expect(
      selectHeroUpdate({ eventId: ALL_FILTER, heroId: "10" }, "20")
    ).toEqual({ heroId: undefined });
  });
});

describe("sortEventsByEndTimeDesc", () => {
  it("sorts events by end time descending", () => {
    const events = [
      {
        color: null,
        endTime: "2026-01-01",
        icon: "calendar",
        id: 1,
        name: "old",
      },
      {
        color: null,
        endTime: "2026-06-01",
        icon: "calendar",
        id: 2,
        name: "new",
      },
    ];
    expect(sortEventsByEndTimeDesc(events).map((e) => e.id)).toEqual([2, 1]);
  });

  it("sorts events without end time last", () => {
    const events = [
      { color: null, icon: "calendar", id: 1, name: "no end" },
      {
        color: null,
        endTime: "2026-06-01",
        icon: "calendar",
        id: 2,
        name: "has end",
      },
    ];
    expect(sortEventsByEndTimeDesc(events).map((e) => e.id)).toEqual([2, 1]);
  });

  it("handles undefined input", () => {
    expect(sortEventsByEndTimeDesc()).toEqual([]);
  });
});

describe("sortHeroesByLevel", () => {
  it("sorts heroes by level ascending", () => {
    const heroes = [
      { id: 1, level: 300, name: "high" },
      { id: 2, level: 30, name: "low" },
    ];
    expect(sortHeroesByLevel(heroes).map((h) => h.id)).toEqual([2, 1]);
  });

  it("handles heroes without a level", () => {
    const heroes = [
      { id: 1, name: "no level" },
      { id: 2, level: 100, name: "has level" },
    ];
    expect(sortHeroesByLevel(heroes).map((h) => h.id)).toEqual([1, 2]);
  });

  it("handles undefined input", () => {
    expect(sortHeroesByLevel()).toEqual([]);
  });
});

describe("isAllFilter", () => {
  it("recognizes the all sentinel", () => {
    expect(isAllFilter(ALL_FILTER)).toBe(true);
    expect(isAllFilter("all")).toBe(true);
  });

  it("rejects other values", () => {
    expect(isAllFilter("1")).toBe(false);
  });
});
