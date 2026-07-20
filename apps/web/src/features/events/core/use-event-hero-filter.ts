import { useAtomValue } from "@effect/atom-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import * as Predicate from "effect/Predicate";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useCallback } from "react";

import { eventsAtom } from "@/features/events/core/event-atoms";
import {
  EventHeroFilterPersistenceSchema,
  isHeroQueryEnabled,
  normalizeEventHeroFilter,
  selectEventUpdate,
  selectHeroUpdate,
  sortHeroesByLevel,
  toQueryInput,
} from "@/features/events/core/event-hero-filter";
import type {
  EventHeroFilterState,
  FilterSelection,
} from "@/features/events/core/event-hero-filter";
import type {
  EventSelectOption,
  HeroSelectOption,
} from "@/features/events/core/select-utils";
import { heroesByEventAtom } from "@/features/events/heroes/hero-atoms";
import { useFilterPersistence } from "@/lib/use-filter-persistence";

/**
 * Route ids that share the Event/Hero URL search shape (eventId/heroId).
 * Constrain the hook to these so TanStack Router's `useSearch`/`useNavigate`
 * stay fully typed without resorting to broad string types.
 */
type EventHeroFilterRouteId =
  | "/dashboard/events/history"
  | "/dashboard/events/ranking";

const DEFAULT_EVENT_HERO_FILTERS = { eventId: undefined, heroId: undefined };

interface UseEventHeroFilterOptions {
  /** Route id, e.g. "/dashboard/events/ranking". */
  routeId: EventHeroFilterRouteId;
  /** localStorage key for persisted Event/Hero fallback. */
  persistenceKey: string;
}

interface UseEventHeroFilterResult {
  state: EventHeroFilterState;
  events: EventSelectOption[] | undefined;
  eventsResult: AsyncResult.AsyncResult<readonly EventSelectOption[], unknown>;
  /** Heroes for the selected Event, sorted by level. Undefined when all Events. */
  sortedHeroes: ReturnType<typeof sortHeroesByLevel>;
  heroesLoading: boolean;
  heroesResult: AsyncResult.AsyncResult<readonly HeroSelectOption[], unknown>;
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

  const [persistedFilters, updatePersistedFilters] = useFilterPersistence(
    persistenceKey,
    EventHeroFilterPersistenceSchema,
    DEFAULT_EVENT_HERO_FILTERS
  );

  const state = normalizeEventHeroFilter({
    persistedEventId: persistedFilters.eventId,
    persistedHeroId: persistedFilters.heroId,
    urlEventId: Predicate.isString(urlEventId) ? urlEventId : undefined,
    urlHeroId: Predicate.isString(urlHeroId) ? urlHeroId : undefined,
  });

  const eventsResult = useAtomValue(eventsAtom);
  const events = AsyncResult.isSuccess(eventsResult)
    ? [...eventsResult.value]
    : [];

  const heroQueryEnabled = isHeroQueryEnabled(state);
  const heroEventId = heroQueryEnabled
    ? (toQueryInput(state.eventId) ?? null)
    : null;
  const heroesResult = useAtomValue(heroesByEventAtom(heroEventId));
  const heroes = AsyncResult.isSuccess(heroesResult) ? heroesResult.value : [];
  const heroesLoading = heroQueryEnabled && AsyncResult.isWaiting(heroesResult);

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
    eventsResult,
    heroQueryEnabled,
    heroesLoading,
    heroesResult,
    queryInputs,
    selectEvent,
    selectHero,
    sortedHeroes,
    state,
  };
};
