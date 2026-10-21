import {
  SquadBuilderConflict,
  SquadBuilderUnauthorized,
  SquadBuilderInvalidInput,
} from "@tepirek-revamped/api/protocol/squad-builder/errors";
import { Cause } from "effect";
import { EffectQueryFailure } from "effect-query";
import { describe, expect, it } from "vite-plus/test";

import { squadEditorReducer } from "@/features/squad-builder/editor/squad-editor-state";
import type { SquadEditorState } from "@/features/squad-builder/editor/squad-editor-state";
import { squadSaveFailureEvent } from "@/features/squad-builder/editor/squad-save-recovery";

describe("squad save recovery", () => {
  it.each([
    [new SquadBuilderConflict({ message: "private details" }), "conflict"],
    [new SquadBuilderUnauthorized({ message: "private details" }), "error"],
    [new SquadBuilderInvalidInput({ message: "" }), "error"],
  ] as const)(
    "preserves edits after a wrapped $_tag save failure",
    (failure, phase) => {
      const error = new EffectQueryFailure(
        "private cause",
        failure,
        Cause.fail(failure)
      );

      const draft = { groupId: 7, name: "Unsaved name", squads: [] };

      const saving: SquadEditorState = {
        draft,
        phase: "saving",
        saveError: null,
        savedSnapshot: { ...draft, name: "Saved name" },
        updatedAt: new Date(0),
        visibility: "private",
        visibilityRequest: "idle",
      };

      const state = squadEditorReducer(saving, squadSaveFailureEvent(error));
      expect(state.phase).toBe(phase);
      expect(state).toHaveProperty("draft", draft);
      expect(state).not.toHaveProperty("saveError", "private details");
    }
  );
});
