// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  shouldIgnoreThemeShortcutTarget,
  ThemeProvider,
} from "@/components/theme-provider";

const matchMedia = (matches: boolean) => ({
  addEventListener: vi.fn(),
  addListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
  matches,
  media: "(prefers-color-scheme: dark)",
  onchange: null,
  removeEventListener: vi.fn(),
  removeListener: vi.fn(),
});

const renderThemeProvider = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableColorScheme
        enableSystem
      >
        <span>content</span>
      </ThemeProvider>
    );
  });

  return { container, root };
};

const dispatchThemeShortcut = (
  target: EventTarget,
  modifier: "ctrlKey" | "metaKey"
) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key: "d",
    shiftKey: true,
    [modifier]: true,
  });
  target.dispatchEvent(event);
  return event;
};

describe("ThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
    localStorage.clear();
    vi.stubGlobal("matchMedia", () => matchMedia(false));
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it("uses the system preference when no choice is persisted", async () => {
    vi.stubGlobal("matchMedia", () => matchMedia(true));

    const { root } = await renderThemeProvider();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBeNull();
    root.unmount();
  });

  it("persists a shortcut choice and changes the document class", async () => {
    localStorage.setItem("theme", "dark");
    const { root } = await renderThemeProvider();

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await act(async () => {
      dispatchThemeShortcut(window, "ctrlKey");
    });

    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
    root.unmount();
  });

  it("supports the macOS shortcut modifier", async () => {
    localStorage.setItem("theme", "light");
    const { root } = await renderThemeProvider();

    await act(async () => {
      dispatchThemeShortcut(window, "metaKey");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    root.unmount();
  });

  it.each(["INPUT", "TEXTAREA", "SELECT"])(
    "ignores the shortcut in %s elements",
    async (tagName) => {
      localStorage.setItem("theme", "dark");
      const { root } = await renderThemeProvider();
      const target = document.createElement(tagName);
      document.body.append(target);

      await act(async () => {
        dispatchThemeShortcut(target, "ctrlKey");
      });

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(localStorage.getItem("theme")).toBe("dark");
      root.unmount();
    }
  );

  it("ignores the shortcut in contenteditable elements", async () => {
    localStorage.setItem("theme", "dark");
    const { root } = await renderThemeProvider();
    const target = document.createElement("div");
    target.contentEditable = "true";
    document.body.append(target);

    await act(async () => {
      dispatchThemeShortcut(target, "ctrlKey");
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(shouldIgnoreThemeShortcutTarget(target)).toBe(true);
    root.unmount();
  });

  it("renders the theme script with hydration protection", () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <span>content</span>
      </ThemeProvider>
    );

    expect(markup).toContain("localStorage.getItem");
    expect(markup).not.toContain("<html");
  });
});
