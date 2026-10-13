// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OwnedAccountsGrid } from "./owned-accounts-grid";

const noop = () => {};

describe("OwnedAccountsGrid", () => {
  it("renders an accessible empty table and an add-account action", () => {
    const markup = renderToStaticMarkup(
      <OwnedAccountsGrid accounts={[]} isLoading={false} onAddAccount={noop} />
    );

    expect(markup).toContain('aria-label="Twoje konta Margonem"');
    expect(markup).toContain('colSpan="5"');
    expect(markup).toContain("Nie masz jeszcze zapisanych kont.");
    expect(markup).toContain("Dodaj konto");
  });

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
