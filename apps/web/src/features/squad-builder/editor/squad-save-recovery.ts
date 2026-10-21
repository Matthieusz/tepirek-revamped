import type { Effect } from "effect";

import type { SquadEditorEvent } from "@/features/squad-builder/editor/squad-editor-state";
import type { saveSquadGroup } from "@/features/squad-builder/squad-group-api";
import type { InferQueryErrorResult } from "@/lib/effect-query";
import { getErrorMessage } from "@/lib/errors";

type SaveError = InferQueryErrorResult<
  Effect.Error<ReturnType<typeof saveSquadGroup>>
>;

/** Translates inferred save failures into editor transitions without replacing edits. */
export const squadSaveFailureEvent = (
  error: SaveError
): Extract<SquadEditorEvent, { type: "saveFailed" | "saveConflicted" }> => ({
  message: getErrorMessage(error, "Nie udało się zapisać grupy składów"),
  type: error.match({
    OrElse: () => "saveFailed" as const,
    SquadBuilderConflict: () => "saveConflicted" as const,
  }),
});
