// @vitest-environment happy-dom

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DashboardCommandMenu } from "@/components/dashboard-command-menu";
import { isCommandMenuHotkey } from "@/components/dashboard-command-menu-hotkey";
import { ThemeProvider } from "@/components/theme-provider";

const RootRouteComponent = () => <Outlet />;
const CommandMenuPage = () => (
  <ThemeProvider attribute="class" defaultTheme="light">
    <DashboardCommandMenu />
  </ThemeProvider>
);
const EventsPage = () => <div>Lista eventów</div>;
const HeroesPage = () => <div>Lista herosów</div>;

const rootRoute = createRootRoute({ component: RootRouteComponent });
const commandMenuRoute = createRoute({
  component: CommandMenuPage,
  getParentRoute: () => rootRoute,
  path: "/",
});
const eventsRoute = createRoute({
  component: EventsPage,
  getParentRoute: () => rootRoute,
  path: "/dashboard/events/list",
});
const heroesRoute = createRoute({
  component: HeroesPage,
  getParentRoute: () => rootRoute,
  path: "/dashboard/events/heroes",
});
const routeTree = rootRoute.addChildren([
  commandMenuRoute,
  eventsRoute,
  heroesRoute,
]);

const renderCommandMenu = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const reactRoot = createRoot(container);
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree,
  });

  await router.load();
  await act(async () => {
    reactRoot.render(<RouterProvider router={router} />);
  });

  return { reactRoot, router };
};

const dispatchCommandHotkey = (modifier: "ctrlKey" | "metaKey") => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "k",
    [modifier]: true,
  });
  window.dispatchEvent(event);
  return event;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("DashboardCommandMenu", () => {
  it("opens with Ctrl+K and Cmd+K while preventing the browser shortcut", async () => {
    const { reactRoot } = await renderCommandMenu();

    let controlEvent: KeyboardEvent | undefined;
    await act(async () => {
      controlEvent = dispatchCommandHotkey("ctrlKey");
    });

    expect(controlEvent?.defaultPrevented).toBe(true);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(
      document.querySelector('input[aria-label="Wyszukaj polecenie"]')
    ).not.toBeNull();

    await act(async () => {
      dispatchCommandHotkey("ctrlKey");
    });

    let metaEvent: KeyboardEvent | undefined;
    await act(async () => {
      metaEvent = dispatchCommandHotkey("metaKey");
    });

    expect(metaEvent?.defaultPrevented).toBe(true);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(
      isCommandMenuHotkey(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      )
    ).toBe(true);

    reactRoot.unmount();
  });

  it("scrolls the active option into view during arrow-key navigation", async () => {
    const { reactRoot } = await renderCommandMenu();

    await act(async () => {
      dispatchCommandHotkey("ctrlKey");
    });

    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Wyszukaj polecenie"]'
    );
    const secondOption =
      document.querySelectorAll<HTMLElement>('[role="option"]')[1];
    if (input === null || secondOption === undefined) {
      throw new Error("The command menu options were not rendered");
    }
    const scrollIntoView = vi.fn();
    secondOption.scrollIntoView = scrollIntoView;

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "ArrowDown",
        })
      );
    });

    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });

    reactRoot.unmount();
  });

  it("moves through routes with the arrow keys, navigates with Enter, and closes", async () => {
    const { reactRoot, router } = await renderCommandMenu();

    await act(async () => {
      dispatchCommandHotkey("ctrlKey");
    });

    const input = document.querySelector<HTMLInputElement>(
      'input[aria-label="Wyszukaj polecenie"]'
    );
    if (input === null) {
      throw new Error("The command menu search input was not rendered");
    }

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "ArrowDown",
        })
      );
    });
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "Enter",
        })
      );
    });

    expect(router.state.location.pathname).toBe("/dashboard/events/heroes");
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    reactRoot.unmount();
  });
});
