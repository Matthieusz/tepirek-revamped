import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

/** Builds the event-name lookup used while rendering hero rows. */
export const getEventNamesById = (
  events: readonly { readonly id: number; readonly name: string }[]
): HashMap.HashMap<number, string> =>
  HashMap.fromIterable(events.map((event) => [event.id, event.name] as const));

/** Returns the event name for a hero, preserving the current missing-event fallback. */
export const getHeroEventName = (
  eventNamesById: HashMap.HashMap<number, string>,
  eventId: number | null | undefined
): string =>
  eventId === null || eventId === undefined
    ? "Brak"
    : HashMap.get(eventNamesById, eventId).pipe(Option.getOrElse(() => "Brak"));
