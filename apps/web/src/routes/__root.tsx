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

import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import type { getUser as getUserDependency } from "@/functions/get-user";
import type { preloadAtomResults as preloadAtomResultsDependency } from "@/lib/atom-preload";
import { getErrorMessage } from "@/lib/errors";

import appCss from "@/index.css?url";

const showDevtools = import.meta.env.DEV;
const applicationDescription =
  "Narzędzia Gildii Złodziei do organizacji wydarzeń, aukcji i wspólnych zadań w Margonem.";

const RootDocument = () => {
  const { atomRegistry } = useRouteContext({ from: "__root__" });

  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          storageKey="theme"
          enableColorScheme
          enableSystem
        >
          <RegistryContext.Provider value={atomRegistry}>
            <div className="grid h-svh min-w-0 grid-rows-[auto_1fr]">
              <Outlet />
            </div>
            <Toaster richColors />
            {showDevtools ? (
              <TanStackRouterDevtools position="bottom-right" />
            ) : null}
          </RegistryContext.Provider>
        </ThemeProvider>
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
  <html lang="pl" suppressHydrationWarning>
    <head>
      <HeadContent />
    </head>
    <body>
      <div className="flex h-svh flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Coś poszło nie tak</h1>
        <p className="text-muted-foreground">{getErrorMessage(error)}</p>
        <Button onClick={reset}>Spróbuj ponownie</Button>
      </div>
      <Scripts />
    </body>
  </html>
);

export interface RouterAppContext {
  readonly atomRegistry: AtomRegistry.AtomRegistry;
  readonly getUser: typeof getUserDependency;
  readonly preloadAtomResults: typeof preloadAtomResultsDependency;
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
        href: "/logo.svg",
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
        content: "Tepirek Revamped",
        name: "application-name",
      },
      {
        content: applicationDescription,
        name: "description",
      },
      {
        content: "#181713",
        name: "theme-color",
      },
      {
        content: "Tepirek Revamped",
        property: "og:title",
      },
      {
        content: applicationDescription,
        property: "og:description",
      },
      {
        content: "website",
        property: "og:type",
      },
      {
        content: "summary",
        name: "twitter:card",
      },
      {
        content: "Tepirek Revamped",
        name: "twitter:title",
      },
      {
        content: applicationDescription,
        name: "twitter:description",
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
