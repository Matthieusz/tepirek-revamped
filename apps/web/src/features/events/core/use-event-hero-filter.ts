import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

import {
  isHeroQueryEnabled,
  normalizeEventHeroFilter,
  selectEventUpdate,
  selectHeroUpdate,
  sortHeroesByLevel,
  toQueryInput,
} from "@/features/events/core/event-hero-filter";
import type {
  EventHeroFilterSearch,
  EventHeroFilterState,
  FilterSelection,
} from "@/features/events/core/event-hero-filter";
import type { EventSelectOption } from "@/features/events/core/event-hero-options";
import { eventsQueryOptions } from "@/features/events/core/event-queries";
import { heroesByEventQueryOptions } from "@/features/events/heroes/hero-queries";

/**
 * Route ids that share the Event/Hero URL search shape (eventId/heroId).
 * Constrain the hook to these so TanStack Router's `useSearch`/`useNavigate`
 * stay fully typed without resorting to broad string types.
 */
type EventHeroFilterRouteId =
  | "/dashboard/events/history"
  | "/dashboard/events/ranking";

interface UseEventHeroFilterOptions {
  /** Route id, e.g. "/dashboard/events/ranking". */
  routeId: EventHeroFilterRouteId;
}

interface UseEventHeroFilterResult {
  state: EventHeroFilterState;
  events: readonly EventSelectOption[] | undefined;
  /** Heroes for the selected Event, sorted by level. Empty when all Events. */
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
 * Connects the pure Event/Hero filter module to the router: validated route
 * search, navigation, and the Event/Hero list queries. Page-specific data
 * queries (ranking, vault, bets) stay in the pages.
 */
export const useEventHeroFilter = (
  options: UseEventHeroFilterOptions
): UseEventHeroFilterResult => {
  const { routeId } = options;

  const { eventId: urlEventId, heroId: urlHeroId } = useSearch({
    from: routeId,
  });

  const navigate = useNavigate({ from: routeId });

  const state = normalizeEventHeroFilter({ urlEventId, urlHeroId });

  const eventsQuery = useQuery(eventsQueryOptions());
  const events = eventsQuery.data;

  const heroQueryEnabled = isHeroQueryEnabled(state);

  const heroEventId = heroQueryEnabled
    ? (toQueryInput(state.eventId) ?? null)
    : null;

  const heroesQuery = useQuery(heroesByEventQueryOptions(heroEventId));
  const heroes = heroesQuery.data ?? [];
  const heroesLoading = heroQueryEnabled && heroesQuery.isPending;

  const sortedHeroes = heroQueryEnabled ? sortHeroesByLevel(heroes) : [];

  const queryInputs = {
    eventId: toQueryInput(state.eventId),
    heroId: toQueryInput(state.heroId),
  };

  const navigateWithSearch = useCallback(
    (updates: EventHeroFilterSearch) => {
      void navigate({
        search: (prev) => ({ ...prev, ...updates }),
      });
    },
    [navigate]
  );

  const selectEvent = useCallback(
    (eventId: FilterSelection) => {
      navigateWithSearch(selectEventUpdate(eventId));
    },
    [navigateWithSearch]
  );

  const selectHero = useCallback(
    (heroId: FilterSelection) => {
      navigateWithSearch(selectHeroUpdate(state, heroId));
    },
    [navigateWithSearch, state]
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
