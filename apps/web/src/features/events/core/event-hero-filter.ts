/* eslint-disable import/namespace -- Effect's namespace imports keep related schema operations grouped. */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Order from "effect/Order";
import * as Schema from "effect/Schema";

import type {
  EventSelectOption,
  HeroSelectOption,
} from "@/features/events/core/select-utils";

/**
 * Deep Event/Hero filter module.
 *
 * One source of truth for the Event/Hero filter concept shared by Ranking,
 * History, and Vault. Owns the `"all"` sentinel, conversion to router query
 * inputs, and Event/Hero sorting. The
 * React/Lucide select rendering stays in `select-utils.tsx`; this module
 * only deals with the filter's shape and rules.
 */

export const ALL_FILTER = "all" as const;
export type FilterSelection = typeof ALL_FILTER | string;

const PositiveIntegerIdFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(
    Schema.isBetween({ maximum: Number.MAX_SAFE_INTEGER, minimum: 1 })
  )
);
const decodePositiveIntegerId = Schema.decodeUnknownOption(
  PositiveIntegerIdFromString
);
const isValidDate = Schema.is(Schema.Date.check(Schema.isDateValid()));

/** Schema for a validated URL positive integer ID encoded as a string. */
export const FilterIdSearchSchema = Schema.String.pipe(
  Schema.refine(
    (value): value is string => Option.isSome(decodePositiveIntegerId(value)),
    {
      message: "Expected a positive integer id",
    }
  )
);

export interface EventHeroFilterState {
  eventId: FilterSelection;
  heroId: FilterSelection;
}

interface EventHeroFilterUpdate extends Record<string, unknown> {
  eventId?: FilterSelection | undefined;
  heroId?: FilterSelection | undefined;
}

export const isAllFilter = (value: FilterSelection): boolean =>
  value === ALL_FILTER;

/**
 * Normalize validated URL search into an Event/Hero filter state. Missing
 * values select all Events and all Heroes. Choosing all Events always clears
 * Hero.
 */
export const normalizeEventHeroFilter = (input: {
  urlEventId: string | undefined;
  urlHeroId: string | undefined;
}): EventHeroFilterState => {
  const resolvedEventId = input.urlEventId ?? ALL_FILTER;
  const resolvedHeroId = input.urlHeroId ?? ALL_FILTER;

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
 * `undefined` for the all sentinel, otherwise a positive integer. Invalid
 * ID strings fall back to `undefined`.
 */
export const toQueryInput = (
  selection: FilterSelection | undefined
): number | undefined => {
  if (selection === undefined || isAllFilter(selection)) {
    return undefined;
  }
  return Option.getOrUndefined(decodePositiveIntegerId(selection));
};

const toEventTimestamp = (eventEndTime: Date | string | undefined): number => {
  if (eventEndTime === undefined) {
    return Number.NEGATIVE_INFINITY;
  }
  const date = new Date(eventEndTime);
  return isValidDate(date) ? date.getTime() : Number.NEGATIVE_INFINITY;
};

/**
 * Sort events by end time descending. Events without an end time sort last.
 */
export const sortEventsByEndTimeDesc = (
  events?: readonly EventSelectOption[]
): EventSelectOption[] =>
  Arr.sortWith(
    events ?? [],
    (event) => toEventTimestamp(event.endTime),
    Order.flip(Order.Number)
  );

/**
 * Sort heroes by level ascending.
 */
export const sortHeroesByLevel = (
  heroes?: readonly HeroSelectOption[]
): HeroSelectOption[] =>
  Arr.sortWith(heroes ?? [], (hero) => hero.level ?? 0, Order.Number);

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
): EventHeroFilterUpdate => ({
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
): EventHeroFilterUpdate => {
  if (isAllFilter(state.eventId)) {
    return { heroId: undefined };
  }
  return { heroId: isAllFilter(heroId) ? undefined : heroId };
};
