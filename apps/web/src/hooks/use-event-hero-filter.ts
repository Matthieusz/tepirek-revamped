import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

import type { EventSelectOption } from "@/components/events/select-utils";
import {
  isHeroQueryEnabled,
  normalizeEventHeroFilter,
  selectEventUpdate,
  selectHeroUpdate,
  sortHeroesByLevel,
  toQueryInput,
} from "@/lib/event-hero-filter";
import type {
  EventHeroFilterState,
  FilterSelection,
} from "@/lib/event-hero-filter";
import { useFilterPersistence } from "@/lib/use-filter-persistence";
import { orpc } from "@/utils/orpc";

export interface UseEventHeroFilterOptions {
  /** Route id, e.g. "/dashboard/events/ranking". */
  routeId: string;
  /** localStorage key for persisted Event/Hero fallback. */
  persistenceKey: string;
}

export interface UseEventHeroFilterResult {
  state: EventHeroFilterState;
  events: EventSelectOption[] | undefined;
  /** Heroes for the selected Event, sorted by level. Undefined when all Events. */
  sortedHeroes: ReturnType<typeof sortHeroesByLevel>;
  heroesLoading: boolean;
  /** Whether the Hero query is enabled (specific Event selected). */
  heroQueryEnabled: boolean;
  /** The Event/Hero filter as router query inputs (undefined for all). */
  queryInputs: { eventId: number | undefined; heroId: number | undefined };
  /** Choose an Event; clears Hero. */
  selectEvent: (eventId: FilterSelection) => void;
  /** Choose a Hero; no-op when all Events is selected. */
  selectHero: (heroId: FilterSelection) => void;
}

/**
 * Connects the pure Event/Hero filter module to the router: route search,
 * localStorage persistence, navigation, and the Event/Hero list queries.
 * Page-specific data queries (ranking, vault, bets) stay in the pages.
 */
export const useEventHeroFilter = (
  options: UseEventHeroFilterOptions
): UseEventHeroFilterResult => {
  const { routeId, persistenceKey } = options;
  const { eventId: urlEventId, heroId: urlHeroId } = useSearch({
    from: routeId,
  });
  const navigate = useNavigate({ from: routeId });

  const [persistedFilters, updatePersistedFilters] = useFilterPersistence<
    Record<string, unknown>
  >(persistenceKey, { eventId: undefined, heroId: undefined });

  const state = normalizeEventHeroFilter({
    persistedEventId: persistedFilters.eventId as string | undefined,
    persistedHeroId: persistedFilters.heroId as string | undefined,
    urlEventId: urlEventId as string | undefined,
    urlHeroId: urlHeroId as string | undefined,
  });

  const { data: events } = useQuery(orpc.event.getAll.queryOptions());

  const heroQueryEnabled = isHeroQueryEnabled(state);
  const { data: heroes, isPending: heroesLoading } = useQuery({
    ...orpc.heroes.getByEventId.queryOptions({
      input: { eventId: Number(state.eventId) },
    }),
    enabled: heroQueryEnabled,
  });

  const sortedHeroes = heroQueryEnabled ? sortHeroesByLevel(heroes) : [];

  const queryInputs = {
    eventId: toQueryInput(state.eventId),
    heroId: toQueryInput(state.heroId),
  };

  const navigateWithPersist = useCallback(
    (updates: Record<string, unknown>) => {
      updatePersistedFilters(updates);
      navigate({
        search: (prev) => ({ ...prev, ...updates }),
      });
    },
    [navigate, updatePersistedFilters]
  );

  const selectEvent = useCallback(
    (eventId: FilterSelection) => {
      navigateWithPersist(selectEventUpdate(eventId));
    },
    [navigateWithPersist]
  );

  const selectHero = useCallback(
    (heroId: FilterSelection) => {
      navigateWithPersist(selectHeroUpdate(state, heroId));
    },
    [navigateWithPersist, state]
  );

  return {
    events,
    heroQueryEnabled,
    heroesLoading,
    queryInputs,
    selectEvent,
    selectHero,
    sortedHeroes,
    state,
  };
};
