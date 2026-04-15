import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import "./index.css";
import "./types/router";
import NotFound from "./components/not-found";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
  const router = createTanStackRouter({
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    context: { orpc, queryClient },
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
