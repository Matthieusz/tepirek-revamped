import { describe, expect, it } from "vitest";

import { EventHeroFilterPersistenceSchema } from "@/features/events/core/event-hero-filter";
import { RankingSortFiltersSchema } from "@/features/events/ranking/ranking-sort";
import {
  decodePersistedValue,
  encodePersistedValue,
} from "@/lib/use-filter-persistence";

describe("persisted filter schemas", () => {
  const eventHeroDefaults = { eventId: undefined, heroId: undefined };
  const rankingDefaults = { sortBy: undefined };

  it("decodes valid event and hero filter state", () => {
    expect(
      decodePersistedValue(
        EventHeroFilterPersistenceSchema,
        eventHeroDefaults,
        '{"eventId":"12","heroId":"34"}'
      )
    ).toEqual({ eventId: "12", heroId: "34" });
  });

  it("falls back to defaults for malformed JSON", () => {
    expect(
      decodePersistedValue(
        EventHeroFilterPersistenceSchema,
        eventHeroDefaults,
        "not-json"
      )
    ).toEqual(eventHeroDefaults);
  });

  it("falls back to defaults for wrong field types", () => {
    expect(
      decodePersistedValue(
        EventHeroFilterPersistenceSchema,
        eventHeroDefaults,
        '{"eventId":12}'
      )
    ).toEqual(eventHeroDefaults);
  });

  it("falls back to defaults for unknown ranking sort literals", () => {
    expect(
      decodePersistedValue(
        RankingSortFiltersSchema,
        rankingDefaults,
        '{"sortBy":"recent"}'
      )
    ).toEqual(rankingDefaults);
  });

  it("preserves valid partial legacy data and fills omitted fields from defaults", () => {
    expect(
      decodePersistedValue(
        EventHeroFilterPersistenceSchema,
        eventHeroDefaults,
        '{"eventId":"2"}'
      )
    ).toEqual({ eventId: "2", heroId: undefined });
  });

  it("round-trips through the schema's JSON codec", () => {
    const value = { eventId: "all", heroId: "3" };
    const stored = encodePersistedValue(
      EventHeroFilterPersistenceSchema,
      value
    );

    expect(
      decodePersistedValue(
        EventHeroFilterPersistenceSchema,
        eventHeroDefaults,
        stored
      )
    ).toEqual(value);
  });
});
