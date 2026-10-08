// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogTrigger,
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

const renderResponsiveTrigger = async (width: number, disabled = false) => {
  window.innerWidth = width;
  vi.stubGlobal("matchMedia", mockMatchMedia);

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onClick = vi.fn();
  const onOpenChange = vi.fn();

  await act(async () => {
    root.render(
      <ResponsiveDialog onOpenChange={onOpenChange}>
        <ResponsiveDialogTrigger asChild>
          <button aria-label="Open form" disabled={disabled} onClick={onClick}>
            Open
          </button>
        </ResponsiveDialogTrigger>
      </ResponsiveDialog>
    );
  });

  return { container, onClick, onOpenChange, root };
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

describe("ResponsiveDialogTrigger", () => {
  it.each([
    ["desktop", 1024],
    ["mobile", 400],
  ] as const)("preserves asChild composition on %s", async (_, width) => {
    const { container, onClick, onOpenChange, root } =
      await renderResponsiveTrigger(width);
    const trigger = container.querySelector("button");

    expect(container.querySelectorAll("button")).toHaveLength(1);
    expect(trigger?.getAttribute("aria-label")).toBe("Open form");

    await act(async () => {
      trigger?.click();
    });

    expect(onClick).toHaveBeenCalledOnce();
    expect(onOpenChange.mock.calls[0]?.[0]).toBe(true);
    root.unmount();
  });

  it.each([
    ["desktop", 1024],
    ["mobile", 400],
  ] as const)("preserves disabled state on %s", async (_, width) => {
    const { container, onClick, root } = await renderResponsiveTrigger(
      width,
      true
    );
    const trigger = container.querySelector("button");

    expect(trigger?.disabled).toBe(true);

    await act(async () => {
      trigger?.click();
    });

    expect(onClick).not.toHaveBeenCalled();
    root.unmount();
  });
});
