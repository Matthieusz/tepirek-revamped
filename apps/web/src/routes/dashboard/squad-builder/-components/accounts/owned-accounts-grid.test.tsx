// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { OwnedAccountsGrid } from "./owned-accounts-grid";

const noop = () => {};

describe("OwnedAccountsGrid", () => {
  it("does not show an empty-state message while accounts are loading", () => {
    const markup = renderToStaticMarkup(
      <OwnedAccountsGrid accounts={[]} isLoading onAddAccount={noop} />
    );

    expect(markup).not.toContain("Nie masz jeszcze zapisanych kont.");
    expect(markup).not.toContain("Dodaj konto");
  });

  it("invokes the add-account action from the empty state", () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    let additions = 0;

    try {
      act(() => {
        root.render(
          <OwnedAccountsGrid
            accounts={[]}
            isLoading={false}
            onAddAccount={() => {
              additions += 1;
            }}
          />
        );
      });
      expect(container.querySelector("table")?.getAttribute("aria-label")).toBe(
        "Twoje konta Margonem"
      );
      expect(container.querySelector("td")?.colSpan).toBe(5);
      expect(container.textContent).toContain(
        "Nie masz jeszcze zapisanych kont."
      );
      const button = container.querySelector("button");
      expect(button?.textContent).toContain("Dodaj konto");
      act(() => {
        button?.click();
      });
      expect(additions).toBe(1);
    } finally {
      act(() => {
        root.unmount();
      });
      container.remove();
    }
  });
});
