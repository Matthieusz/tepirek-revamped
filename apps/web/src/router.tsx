import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";

import "./index.css";
import "./types/router";
import NotFound from "./components/not-found";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const atomRegistry = AtomRegistry.make({ defaultIdleTTL: 400 });
  const router = createTanStackRouter({
    context: { atomRegistry },
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
