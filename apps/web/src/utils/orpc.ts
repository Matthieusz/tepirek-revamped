import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "@tepirek-revamped/api/routers/index";
import { toast } from "sonner";

import { serverUrl } from "@/lib/env";

export const createAppQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 30,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 1000 * 60 * 5,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`, {
          action: {
            label: "retry",
            onClick: () => {
              // oxlint-disable-next-line @typescript-eslint/no-floating-promises
              queryClient.invalidateQueries();
            },
          },
        });
      },
    }),
  });

  return queryClient;
};

const link = new RPCLink({
  fetch(_url, options) {
    return fetch(_url, {
      ...options,
      credentials: "include",
    });
  },
  url: `${serverUrl}/rpc`,
});

const client: RouterClient<AppRouter> = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
