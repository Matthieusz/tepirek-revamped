import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import Loader from "./components/loader";
import "./index.css";
import "./types/router";
import { QueryClientProvider } from "@tanstack/react-query";
import NotFound from "./components/not-found";
import { routeTree } from "./routeTree.gen";
import { orpc, queryClient } from "./utils/orpc";

export const getRouter = () => {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    context: { orpc, queryClient },
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: () => <NotFound />,
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  });
  return router;
};

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: <consistency with tanstack>
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
