import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

import { queryDiagnostic, reportQueryDiagnostic } from "./query-diagnostics";
import type { QueryDiagnostic } from "./query-diagnostics";
import { queryRetryDelay, shouldRetryQuery } from "./query-failure-policy";

const queryStaleTime = 30_000;

const queryGcTime = 5 * 60_000;

/**
 * Creates the QueryClient owned by one router instance.
 *
 * Query data stays fresh for 30 seconds and is retained for five minutes after
 * becoming unused. Transient reads retry once and may refresh on mount, focus, or
 * reconnect; mutations never retry because commands are not assumed to be
 * idempotent.
 */
export const createQueryClient = (
  report: (diagnostic: QueryDiagnostic) => void = reportQueryDiagnostic
): QueryClient =>
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
        retry: shouldRetryQuery,
        retryDelay: queryRetryDelay,
        staleTime: queryStaleTime,
      },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _result, mutation) => {
        report(queryDiagnostic("mutation", mutation.meta?.operation, error));
      },
    }),
    queryCache: new QueryCache({
      onError: (error, query) => {
        report(queryDiagnostic("query", query.meta?.operation, error));
      },
    }),
  });
