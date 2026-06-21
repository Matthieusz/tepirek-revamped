import type {
  EventSelectOption,
  HeroSelectOption,
} from "@/components/events/select-utils";

/**
 * Deep Event/Hero filter module.
 *
 * One source of truth for the Event/Hero filter concept shared by Ranking,
 * History, and Vault. Owns the `"all"` sentinel, URL/persisted precedence,
 * conversion to router query inputs, and Event/Hero sorting. The
 * React/Lucide select rendering stays in `select-utils.tsx`; this module
 * only deals with the filter's shape and rules.
 */

export const ALL_FILTER = "all" as const;
export type FilterSelection = typeof ALL_FILTER | string;

export interface EventHeroFilterState {
  eventId: FilterSelection;
  heroId: FilterSelection;
}

export const isAllFilter = (value: FilterSelection): boolean =>
  value === ALL_FILTER;

/**
 * Normalize raw URL search and persisted fallback into one Event/Hero
 * filter state. URL search wins over persisted; missing both falls back
 * to all Events and all Heroes. Choosing all Events always clears Hero,
 * even when a persisted Hero value exists.
 */
export const normalizeEventHeroFilter = (input: {
  urlEventId: string | undefined;
  urlHeroId: string | undefined;
  persistedEventId: string | undefined;
  persistedHeroId: string | undefined;
}): EventHeroFilterState => {
  const resolvedEventId =
    input.urlEventId ?? input.persistedEventId ?? ALL_FILTER;
  const resolvedHeroId = input.urlHeroId ?? input.persistedHeroId ?? ALL_FILTER;

  const eventId: FilterSelection = isAllFilter(resolvedEventId)
    ? ALL_FILTER
    : resolvedEventId;

  // Choosing all Events clears Hero: there is no Hero without an Event.
  let heroId: FilterSelection = ALL_FILTER;
  if (!isAllFilter(eventId) && !isAllFilter(resolvedHeroId)) {
    heroId = resolvedHeroId;
  }

  return { eventId, heroId };
};

/**
 * Convert a filter selection to a router query input value. Returns
 * `undefined` for the all sentinel, otherwise a parsed number. Invalid
 * numeric strings fall back to `undefined` to match route search behavior.
 */
export const toQueryInput = (
  selection: FilterSelection
): number | undefined => {
  if (isAllFilter(selection)) {
    return undefined;
  }
  const parsed = Number.parseInt(selection, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toEventTimestamp = (eventEndTime: Date | string | undefined): number => {
  if (eventEndTime === undefined) {
    return Number.NEGATIVE_INFINITY;
  }
  const timestamp = new Date(eventEndTime).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

/**
 * Sort events by end time descending. Events without an end time sort last.
 */
export const sortEventsByEndTimeDesc = (
  events?: readonly EventSelectOption[]
): EventSelectOption[] =>
  [...(events ?? [])].toSorted(
    (a, b) => toEventTimestamp(b.endTime) - toEventTimestamp(a.endTime)
  );

/**
 * Sort heroes by level ascending.
 */
export const sortHeroesByLevel = (
  heroes?: readonly HeroSelectOption[]
): HeroSelectOption[] =>
  [...(heroes ?? [])].toSorted((a, b) => (a.level ?? 0) - (b.level ?? 0));

/**
 * Decide whether the Hero query should be enabled: only when a specific
 * Event is selected.
 */
export const isHeroQueryEnabled = (state: EventHeroFilterState): boolean =>
  !isAllFilter(state.eventId);

/**
 * Build the URL search update for choosing an Event. Selecting all Events
 * (or clearing the Event) always clears Hero.
 */
export const selectEventUpdate = (
  eventId: FilterSelection
): Partial<EventHeroFilterState> => ({
  eventId: isAllFilter(eventId) ? undefined : eventId,
  heroId: undefined,
});

/**
 * Build the URL search update for choosing a Hero. Hero can only be set
 * when a specific Event is selected; otherwise it is cleared.
 */
export const selectHeroUpdate = (
  state: EventHeroFilterState,
  heroId: FilterSelection
): Partial<EventHeroFilterState> => {
  if (isAllFilter(state.eventId)) {
    return { heroId: undefined };
  }
  return { heroId: isAllFilter(heroId) ? undefined : heroId };
};
