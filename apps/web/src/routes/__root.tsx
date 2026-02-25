import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import type { orpc } from "@/utils/orpc";

import appCss from "@/index.css?url";

const RootDocument = () => (
  <html className="dark" lang="en" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      <div className="grid h-svh grid-rows-[auto_1fr]">
        <Outlet />
      </div>
      <Toaster richColors />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools buttonPosition="bottom-right" position="bottom" />
      <Scripts />
    </body>
  </html>
);

const RootErrorBoundary = ({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) => (
  <html className="dark" lang="en">
    <head>
      <HeadContent />
    </head>
    <body>
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <h1 className="font-bold text-2xl">Coś poszło nie tak</h1>
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Nieznany błąd"}
        </p>
        <Button onClick={reset}>Spróbuj ponownie</Button>
      </div>
      <Scripts />
    </body>
  </html>
);

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,

  errorComponent: RootErrorBoundary,
  head: () => ({
    links: [
      {
        href: appCss,
        rel: "stylesheet",
      },
      {
        href: "/favicon.ico",
        rel: "icon",
      },
    ],
    meta: [
      {
        charSet: "utf8",
      },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      {
        title: "Tepirek Revamped",
      },
    ],
    scripts: [
      {
        "data-website-id": "f50f5d33-94f8-4de9-a175-21da0e10f655",
        defer: true,
        src: "https://analytics.informati.dev/script.js",
      },
    ],
  }),
});
