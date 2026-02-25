import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import "./index.css";
import "./types/router";
import Loader from "./components/loader";
import NotFound from "./components/not-found";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
  const router = createTanStackRouter({
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    context: { orpc, queryClient },
    defaultNotFoundComponent: () => <NotFound />,
    defaultPendingComponent: () => <Loader />,
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
