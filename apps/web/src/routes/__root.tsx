import { RegistryContext } from "@effect/atom-react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { evlogErrorHandler } from "evlog/nitro/v3";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { getErrorMessage } from "@/lib/errors";

import appCss from "@/index.css?url";

const showDevtools = import.meta.env.DEV;

const RootDocument = () => {
  const { atomRegistry } = useRouteContext({ from: "__root__" });

  return (
    <html className="dark" lang="pl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RegistryContext.Provider value={atomRegistry}>
          <div className="grid h-svh grid-rows-[auto_1fr]">
            <Outlet />
          </div>
          <Toaster richColors />
          {showDevtools ? (
            <>
              <TanStackRouterDevtools position="bottom-right" />
            </>
          ) : null}
        </RegistryContext.Provider>
        <Scripts />
      </body>
    </html>
  );
};

export const RootErrorBoundary = ({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) => (
  <html className="dark" lang="pl">
    <head>
      <HeadContent />
    </head>
    <body>
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <h1 className="font-bold text-2xl">Coś poszło nie tak</h1>
        <p className="text-muted-foreground">{getErrorMessage(error)}</p>
        <Button onClick={reset}>Spróbuj ponownie</Button>
      </div>
      <Scripts />
    </body>
  </html>
);

export interface RouterAppContext {
  readonly atomRegistry: AtomRegistry.AtomRegistry;
}

const evlogMiddleware = createMiddleware().server(evlogErrorHandler);

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
        charSet: "utf-8",
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

  server: {
    middleware: [evlogMiddleware],
  },
});
