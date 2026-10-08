// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const renderTabs = async (orientation: "horizontal" | "vertical") => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <Tabs defaultValue="first" orientation={orientation}>
        <TabsList>
          <TabsTrigger value="first">First</TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First content</TabsContent>
        <TabsContent value="second">Second content</TabsContent>
      </Tabs>
    );
  });

  return { container, root };
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("Tabs orientation", () => {
  it.each(["horizontal", "vertical"] as const)(
    "forwards the %s orientation to the tabs primitive",
    async (orientation) => {
      const { container, root } = await renderTabs(orientation);
      const tabsRoot = container.querySelector('[data-slot="tabs"]');
      const tabList = container.querySelector('[role="tablist"]');
      const firstTab = container.querySelector('[role="tab"]');

      expect(tabsRoot?.getAttribute("data-orientation")).toBe(orientation);
      expect(tabList?.getAttribute("aria-orientation")).toBe(
        orientation === "vertical" ? "vertical" : null
      );
      expect(firstTab?.getAttribute("data-orientation")).toBe(orientation);

      root.unmount();
    }
  );
});
