import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

import NotFound from "./components/not-found";

import "./index.css";
import "./types/router";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { getUser } from "./functions/get-user";
import { preloadAtomResults } from "./lib/atom-preload";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const atomRegistry = AtomRegistry.make({ defaultIdleTTL: 400 });
  const router = createTanStackRouter({
    context: { atomRegistry, getUser, preloadAtomResults },
    defaultNotFoundComponent: () => <NotFound />,
    defaultPendingComponent: () => <LoadingSpinner />,
    routeTree,
    scrollRestoration: true,
  });
  return router;
};

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: <consistency with tanstack>
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
