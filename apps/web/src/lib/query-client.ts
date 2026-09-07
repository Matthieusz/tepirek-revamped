import { QueryClient } from "@tanstack/react-query";

const queryStaleTime = 30_000;
const queryGcTime = 5 * 60_000;

/**
 * Creates the QueryClient owned by one router instance.
 *
 * Query data stays fresh for 30 seconds and is retained for five minutes after
 * becoming unused. Reads retry once and may refresh on mount, focus, or
 * reconnect; mutations never retry because commands are not assumed to be
 * idempotent.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        gcTime: queryGcTime,
        refetchOnMount: true,
        refetchOnReconnect: true,
        refetchOnWindowFocus: true,
        retry: 1,
        staleTime: queryStaleTime,
      },
    },
  });
