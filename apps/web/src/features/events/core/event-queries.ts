import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";

import {
  createEvent,
  deleteEvent,
  listEvents,
  toggleEventActive,
} from "@/features/events/core/event-api";
import type {
  DeleteEventInput,
  Event,
  EventApiRunner,
  ToggleEventActiveInput,
} from "@/features/events/core/event-api";
import { runAppHttpApi } from "@/lib/http-api-client-runtime";

/** Cache key for the authenticated user's event list. */
export const eventsQueryKey = ["events"] as const;

interface EventMutationCallbacks {
  readonly onError?: (error: Error) => void;
  readonly onRefreshError?: (error: Error) => void;
}

interface DeleteEventContext {
  readonly previousEvent: Event | undefined;
  readonly previousIndex: number;
}

interface ToggleEventContext {
  readonly previousEvent: Event | undefined;
}

const hasConcurrentEventMutation = (queryClient: QueryClient): boolean =>
  queryClient
    .getMutationCache()
    .getAll()
    .filter(
      (mutation) =>
        mutation.state.status === "pending" &&
        mutation.options.mutationKey?.[0] === eventsQueryKey[0]
    ).length > 1;

const invalidateEvents = async (
  queryClient: QueryClient,
  callbacks: EventMutationCallbacks
): Promise<void> => {
  try {
    await queryClient.invalidateQueries(
      { queryKey: eventsQueryKey },
      { throwOnError: true }
    );
  } catch (error: unknown) {
    callbacks.onRefreshError?.(
      error instanceof Error ? error : new Error("Event list refresh failed")
    );
  }
};

const invalidateEventsAfterMutation = async (
  queryClient: QueryClient,
  callbacks: EventMutationCallbacks
): Promise<void> => {
  if (!hasConcurrentEventMutation(queryClient)) {
    await invalidateEvents(queryClient, callbacks);
  }
};

/** Returns Query options for the authenticated user's events. */
export const eventsQueryOptions = (runner: EventApiRunner = runAppHttpApi) =>
  queryOptions({
    queryFn: async ({ signal }) => await runner(listEvents(), { signal }),
    queryKey: eventsQueryKey,
  });

/** Returns mutation options for creating an event. */
export const createEventMutationOptions = (
  queryClient: QueryClient,
  runner: EventApiRunner = runAppHttpApi,
  callbacks: EventMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (payload: Parameters<typeof createEvent>[0]) => {
      await runner(createEvent(payload));
    },
    mutationKey: [...eventsQueryKey, "mutation", "create"],
    onError: (error: Error) => {
      callbacks.onError?.(error);
    },
    onSuccess: async () => {
      await invalidateEvents(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for deleting an event. */
export const deleteEventMutationOptions = (
  queryClient: QueryClient,
  runner: EventApiRunner = runAppHttpApi,
  callbacks: EventMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: DeleteEventInput) => {
      await runner(deleteEvent(input));
    },
    mutationKey: [...eventsQueryKey, "mutation", "delete"],
    onError: (
      error: Error,
      input: DeleteEventInput,
      context: DeleteEventContext | undefined
    ) => {
      const previousEvent = context?.previousEvent;
      if (previousEvent !== undefined) {
        queryClient.setQueryData<readonly Event[]>(eventsQueryKey, (events) => {
          if (
            events === undefined ||
            events.some((event) => event.id === input.id)
          ) {
            return events;
          }
          const index = Math.min(context?.previousIndex ?? 0, events.length);
          return [
            ...events.slice(0, index),
            previousEvent,
            ...events.slice(index),
          ];
        });
      }
      callbacks.onError?.(error);
    },
    onMutate: async (input: DeleteEventInput) => {
      await queryClient.cancelQueries({ queryKey: eventsQueryKey });
      const events = queryClient.getQueryData<readonly Event[]>(eventsQueryKey);
      const previousIndex =
        events?.findIndex((event) => event.id === input.id) ?? -1;
      const previousEvent =
        previousIndex >= 0 && events !== undefined
          ? events[previousIndex]
          : undefined;
      queryClient.setQueryData<readonly Event[]>(eventsQueryKey, (current) =>
        current?.filter((event) => event.id !== input.id)
      );
      return {
        previousEvent,
        previousIndex: Math.max(previousIndex, 0),
      };
    },
    onSettled: async () => {
      await invalidateEventsAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });

/** Returns optimistic mutation options for changing an event's active state. */
export const toggleEventActiveMutationOptions = (
  queryClient: QueryClient,
  runner: EventApiRunner = runAppHttpApi,
  callbacks: EventMutationCallbacks = {}
) =>
  mutationOptions({
    mutationFn: async (input: ToggleEventActiveInput) => {
      await runner(toggleEventActive(input));
    },
    mutationKey: [...eventsQueryKey, "mutation", "toggle-active"],
    onError: (
      error: Error,
      _input: ToggleEventActiveInput,
      context: ToggleEventContext | undefined
    ) => {
      const previousEvent = context?.previousEvent;
      if (previousEvent !== undefined) {
        queryClient.setQueryData<readonly Event[]>(eventsQueryKey, (events) =>
          events?.map((event) =>
            event.id === previousEvent.id ? previousEvent : event
          )
        );
      }
      callbacks.onError?.(error);
    },
    onMutate: async (input: ToggleEventActiveInput) => {
      await queryClient.cancelQueries({ queryKey: eventsQueryKey });
      const previousEvent = queryClient
        .getQueryData<readonly Event[]>(eventsQueryKey)
        ?.find((event) => event.id === input.id);
      queryClient.setQueryData<readonly Event[]>(eventsQueryKey, (events) =>
        events?.map((event) =>
          event.id === input.id ? { ...event, active: input.active } : event
        )
      );
      return { previousEvent };
    },
    onSettled: async () => {
      await invalidateEventsAfterMutation(queryClient, callbacks);
    },
    retry: false,
  });
