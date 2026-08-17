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
import { afterEach, describe, expect, it } from "vitest";

import { BreadcrumbNav } from "@/components/breadcrumb-nav";

const RootRouteComponent = () => <Outlet />;
const DashboardRouteComponent = () => (
  <>
    <BreadcrumbNav />
    <Outlet />
  </>
);
const PageRouteComponent = () => <p>Bohaterowie</p>;

const rootRoute = createRootRoute({
  component: RootRouteComponent,
  staticData: { crumb: "Panel" },
});
const dashboardRoute = createRoute({
  component: DashboardRouteComponent,
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  staticData: { crumb: "" },
});
const pageRoute = createRoute({
  component: PageRouteComponent,
  getParentRoute: () => dashboardRoute,
  path: "/heroes",
  staticData: { crumb: "Bohaterowie" },
});
const routeTree = rootRoute.addChildren([
  dashboardRoute.addChildren([pageRoute]),
]);

const renderBreadcrumb = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const reactRoot = createRoot(container);
  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ["/dashboard/heroes"] }),
    routeTree,
  });

  await router.load();
  await act(async () => {
    reactRoot.render(<RouterProvider router={router} />);
  });

  return { reactRoot };
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("BreadcrumbNav", () => {
  it("does not render empty route labels as links", async () => {
    const { reactRoot } = await renderBreadcrumb();
    const breadcrumb = document.querySelector('[aria-label="breadcrumb"]');

    expect(breadcrumb?.textContent).toContain("Panel");
    expect(breadcrumb?.textContent).toContain("Bohaterowie");
    expect(breadcrumb?.querySelectorAll("a")).toHaveLength(1);
    expect(breadcrumb?.querySelector("a")?.textContent).toBe("Panel");

    reactRoot.unmount();
  });
});
