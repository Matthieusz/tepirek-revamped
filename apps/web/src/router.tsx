import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

import NotFound from "./components/not-found";

import "./index.css";
import "./types/router";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { getUser } from "./functions/get-user";
import { preloadAtomResults } from "./lib/atom-preload";
import { createQueryClient } from "./lib/query-client";
import { routeTree } from "./routeTree.gen";

/** Creates an isolated router, QueryClient, and temporary Atom registry. */
export const getRouter = () => {
  const atomRegistry = AtomRegistry.make({ defaultIdleTTL: 400 });
  const queryClient = createQueryClient();
  const router = createTanStackRouter({
    context: { atomRegistry, getUser, preloadAtomResults, queryClient },
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
