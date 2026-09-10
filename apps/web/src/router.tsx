import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import NotFound from "./components/not-found";

import "./index.css";
import "./types/router";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { getUser } from "./functions/get-user";
import { createQueryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

/** Creates an isolated router and QueryClient. */
export const getRouter = () => {
  const queryClient = createQueryClient();

  const router = createTanStackRouter({
    context: { getUser, queryClient },
    defaultNotFoundComponent: () => <NotFound />,
    defaultPendingComponent: () => <LoadingSpinner />,
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({ queryClient, router });

  return router;
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
