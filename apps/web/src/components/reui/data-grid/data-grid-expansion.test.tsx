// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OwnedAccountsGrid } from "@/routes/dashboard/squad-builder/-components/accounts/owned-accounts-grid";

vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

vi.mock(
  "@/routes/dashboard/squad-builder/-components/accounts/owned-account-management-row",
  () => ({
    OwnedAccountManagementRow: ({
      account,
    }: {
      readonly account: { readonly displayName: string };
    }) => <div>Kontrolki konta: {account.displayName}</div>,
  })
);

type Account = Parameters<typeof OwnedAccountsGrid>[0]["accounts"][number];

const account = {
  accountId: 1,
  characterCount: 0,
  characterPreviews: [],
  displayName: "Jaruna",
  generatedProfileUrl: "https://www.margonem.pl/profile/view,1",
  lastFetchedAt: new Date("2026-01-01T00:00:00.000Z"),
  profileId: 1,
} as unknown as Account;

afterEach(() => {
  document.body.replaceChildren();
});

describe("OwnedAccountsGrid expansion", () => {
  it("opens account management controls from Zarządzaj", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <OwnedAccountsGrid
          accounts={[account]}
          isLoading={false}
          onAddAccount={() => undefined}
        />
      );
    });

    const button = container.querySelector<HTMLButtonElement>("button");
    if (button === null) {
      throw new Error("The account management button was not rendered");
    }

    await act(async () => {
      button.click();
    });

    expect(container.textContent).toContain("Kontrolki konta: Jaruna");
    root.unmount();
  });
});
