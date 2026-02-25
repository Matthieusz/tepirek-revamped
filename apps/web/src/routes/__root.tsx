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

import appCss from "../index.css?url";
export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootDocument,

  errorComponent: RootErrorBoundary,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Tepirek Revamped",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
    scripts: [
      {
        src: "https://analytics.informati.dev/script.js",
        defer: true,
        "data-website-id": "f50f5d33-94f8-4de9-a175-21da0e10f655",
      },
    ],
  }),
});

function RootDocument() {
  return (
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
}

function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
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
}
