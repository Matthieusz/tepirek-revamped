import { describe, expect, it } from "vite-plus/test";

import {
  initialSquadEditorState,
  squadEditorReducer,
} from "./squad-editor-state";
import type { SquadEditorState } from "./squad-editor-state";

const draft = { groupId: 7, name: "Saved", squads: [] };

const clean: SquadEditorState = {
  draft,
  phase: "clean",
  saveError: null,
  savedSnapshot: draft,
  updatedAt: new Date(0),
  visibility: "private",
  visibilityRequest: "idle",
};

describe("editor workflow interface", () => {
  it("tracks edits and becomes clean when the saved draft is restored", () => {
    const dirty = squadEditorReducer(clean, {
      draft: { ...draft, name: "Unsaved" },
      type: "draftChanged",
    });

    expect(dirty.phase).toBe("dirty");
    expect(squadEditorReducer(dirty, { draft, type: "draftChanged" })).toEqual(
      clean
    );
  });

  it("preserves the submitted draft on conflict and resets only on explicit reload", () => {
    const edited = { ...draft, name: "Unsaved" };

    const dirty = squadEditorReducer(clean, {
      draft: edited,
      type: "draftChanged",
    });

    const saving = squadEditorReducer(dirty, {
      draft: edited,
      type: "saveStarted",
    });

    expect(saving.phase).toBe("saving");
    expect(squadEditorReducer(saving, { draft, type: "draftChanged" })).toBe(
      saving
    );

    const conflict = squadEditorReducer(saving, {
      message: "Reload required",
      type: "saveConflicted",
    });

    expect(conflict).toMatchObject({
      draft: edited,
      phase: "conflict",
      savedSnapshot: draft,
    });
    expect(squadEditorReducer(conflict, { type: "reloadLatest" })).toEqual(
      initialSquadEditorState
    );
  });
});
