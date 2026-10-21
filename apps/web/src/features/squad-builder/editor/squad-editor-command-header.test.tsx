// @vitest-environment happy-dom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { Dialog } from "@/components/ui/dialog";
import { SquadEditorCommandHeader } from "@/features/squad-builder/editor/squad-editor-command-header";

const noop = () => {};

const renderHeader = (name: string, isSaveConflict = false) => {
  const role = "owner";
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(
    <Dialog>
      <SquadEditorCommandHeader
        draft={{ groupId: 7, name, squads: [] }}
        state={{
          isDirty: true,
          isSaving: false,
          isSettingsOpen: false,
          isVisibilityPending: false,
        }}
        variant="editor"
        role={role}
        saveError={isSaveConflict ? "Zasób został zmieniony." : null}
        visibility="private"
        isSaveConflict={isSaveConflict}
        onNameChange={noop}
        onSave={noop}
        onReloadLatest={noop}
        onVisibilityChange={noop}
      />
    </Dialog>
  );

  return container;
};

describe("squad editor recovery controls", () => {
  it("attaches required-name validation to the input", () => {
    const container = renderHeader("   ");
    const input = container.querySelector("#group-name");
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(input?.getAttribute("aria-describedby")).toBe("group-name-error");
    expect(container.querySelector("#group-name-error")?.textContent).toBe(
      "Podaj nazwę grupy."
    );
    expect(
      renderHeader("Valid name").querySelector("#group-name-error")
    ).toBeNull();
  });

  it("offers load-latest while keeping the unsaved name visible after conflict", () => {
    const container = renderHeader("Unsaved name", true);
    expect(
      container.querySelector<HTMLInputElement>("#group-name")?.value
    ).toBe("Unsaved name");
    expect(container.textContent).toContain("Wczytaj najnowszą wersję");
    expect(container.textContent).toContain("Zmiany nie zostały zapisane");
  });
});
