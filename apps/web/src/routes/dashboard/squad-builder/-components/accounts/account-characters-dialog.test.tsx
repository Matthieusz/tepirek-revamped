// @vitest-environment happy-dom

import { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import * as Schema from "effect/Schema";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { AccountCharactersDialog } from "./account-characters-dialog";

const makeAccount = (empty: boolean) =>
  Schema.decodeSync(OwnedMargonemAccountSummarySchema)({
    accountId: 1,
    characterCount: empty ? 0 : 2,
    characterPreviews: [],
    characters: empty
      ? []
      : [
          {
            avatarUrl: null,
            characterId: 1,
            level: 200,
            name: "Pierwsza postać",
            profession: "warrior",
          },
          {
            avatarUrl: null,
            characterId: 2,
            level: 100,
            name: "Druga postać",
            profession: "mage",
          },
        ],
    displayName: "Testowe konto",
    generatedProfileUrl: "https://www.margonem.pl/profile/view,123",
    lastFetchedAt: "2026-01-01T12:00:00.000Z",
    profileId: 123,
  });

describe("AccountCharactersDialog", () => {
  it.each([false, true])(
    "opens the complete roster or its empty state (empty: %s)",
    async (empty) => {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);

      try {
        await act(async () => {
          root.render(<AccountCharactersDialog account={makeAccount(empty)} />);
          await Promise.resolve();
        });
        const button = container.querySelector("button");
        expect(button?.getAttribute("aria-label")).toBe(
          "Pokaż postacie konta Testowe konto"
        );
        expect(document.querySelector('[role="dialog"]')).toBeNull();
        await act(async () => {
          button?.click();
          await Promise.resolve();
        });
        const dialog = document.querySelector('[role="dialog"]');
        expect(dialog?.textContent).toContain("Testowe konto");

        if (empty) {
          expect(dialog?.textContent).toContain(
            "Brak zapisanych postaci z Jaruny."
          );
        } else {
          expect(dialog?.querySelectorAll("li")).toHaveLength(2);
          expect(dialog?.textContent).toContain("Pierwsza postać");
          expect(dialog?.textContent).toContain("Druga postać");
          expect(dialog?.textContent).toContain("200 lvl");
          expect(dialog?.textContent).toContain("100 lvl");
        }
      } finally {
        await act(async () => {
          root.unmount();
          await Promise.resolve();
        });
        container.remove();
      }
    }
  );
});
