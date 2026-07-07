import { useAtomValue } from "@effect-atom/atom-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";

import type { EventSelectOption } from "@/components/events/select-utils";
import { resultIsLoading, resultValueOr } from "@/lib/effect-atom-result";
import { eventsAtom } from "@/lib/event-atoms";
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
import { heroesByEventAtom } from "@/lib/hero-atoms";
import { useFilterPersistence } from "@/lib/use-filter-persistence";

/**
 * Route ids that share the Event/Hero URL search shape (eventId/heroId).
 * Constrain the hook to these so TanStack Router's `useSearch`/`useNavigate`
 * stay fully typed without resorting to broad string types.
 */
type EventHeroFilterRouteId =
  | "/dashboard/events/history"
  | "/dashboard/events/ranking";

export interface UseEventHeroFilterOptions {
  /** Route id, e.g. "/dashboard/events/ranking". */
  routeId: EventHeroFilterRouteId;
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
    urlEventId: typeof urlEventId === "string" ? urlEventId : undefined,
    urlHeroId: typeof urlHeroId === "string" ? urlHeroId : undefined,
  });

  const eventsResult = useAtomValue(eventsAtom);
  const events = [...resultValueOr(eventsResult, [])] as EventSelectOption[];

  const heroQueryEnabled = isHeroQueryEnabled(state);
  const heroEventId = heroQueryEnabled ? Number(state.eventId) : null;
  const heroesResult = useAtomValue(heroesByEventAtom(heroEventId));
  const heroes = heroQueryEnabled ? resultValueOr(heroesResult, []) : [];
  const heroesLoading = heroQueryEnabled && resultIsLoading(heroesResult);

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
