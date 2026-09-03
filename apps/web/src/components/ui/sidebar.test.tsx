// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const mockMatchMedia = () => ({
  addEventListener: vi.fn(),
  addListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
  matches: false,
  media: "(max-width: 899px)",
  onchange: null,
  removeEventListener: vi.fn(),
  removeListener: vi.fn(),
});

const renderSidebar = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <SidebarProvider>
        <Sidebar />
        <SidebarTrigger />
      </SidebarProvider>
    );
  });

  return { root };
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", mockMatchMedia);
  document.cookie = "sidebar_state=; path=/; max-age=0";
});

afterEach(() => {
  document.body.replaceChildren();
  document.cookie = "sidebar_state=; path=/; max-age=0";
  vi.unstubAllGlobals();
});

describe("SidebarProvider", () => {
  it("initializes from the persisted sidebar state", async () => {
    document.cookie = "sidebar_state=false; path=/";

    const { root } = await renderSidebar();

    expect(
      document.querySelector('[data-slot="sidebar"][data-state="collapsed"]')
    ).not.toBeNull();
    root.unmount();
  });

  it("falls back to document.cookie when Cookie Store fails", async () => {
    const setCookie = vi
      .fn()
      .mockRejectedValue(new Error("Cookie Store failed"));
    vi.stubGlobal("cookieStore", { set: setCookie });

    const { root } = await renderSidebar();
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-slot="sidebar-trigger"]'
    );
    if (trigger === null) {
      throw new Error("The sidebar trigger was not rendered");
    }

    await act(async () => {
      trigger.click();
    });

    expect(setCookie).toHaveBeenCalledOnce();
    expect(document.cookie).toContain("sidebar_state=false");
    root.unmount();
  });
});
