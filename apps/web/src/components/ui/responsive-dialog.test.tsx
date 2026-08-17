// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@/components/ui/responsive-dialog";

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

const renderResponsiveDialog = async (width: number) => {
  window.innerWidth = width;
  vi.stubGlobal("matchMedia", mockMatchMedia);

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <ResponsiveDialog open>
        <ResponsiveDialogContent
          description="Dialog description"
          title="Dialog title"
        >
          <p>Dialog content</p>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  });

  return { root };
};

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("ResponsiveDialogContent", () => {
  it.each([
    ["desktop", 1024],
    ["mobile", 400],
  ] as const)("gives the %s content an accessible name", async (_, width) => {
    const { root } = await renderResponsiveDialog(width);
    const dialog = document.querySelector('[role="dialog"]');
    const labelledBy = dialog?.getAttribute("aria-labelledby");

    expect(dialog).not.toBeNull();
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy ?? "")?.textContent).toBe(
      "Dialog title"
    );
    expect(
      dialog?.querySelectorAll(
        '[data-slot="dialog-title"], [data-slot="drawer-title"]'
      )
    ).toHaveLength(1);

    root.unmount();
  });
});
