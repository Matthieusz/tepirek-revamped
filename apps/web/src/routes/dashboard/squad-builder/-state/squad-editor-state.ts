import type { SquadGroupDetailSchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";

import { hydrateDraft, isDraftEqual } from "./squad-group-draft";
import type { SquadGroupDraft } from "./squad-group-draft";

type SquadGroupDetail = SquadGroupDetailSchema;
type SquadEditorVisibility = "private" | "global";

interface HydratedEditorData {
  readonly draft: SquadGroupDraft;
  readonly savedSnapshot: SquadGroupDraft;
  readonly updatedAt: Date;
  readonly visibility: SquadEditorVisibility;
  readonly visibilityRequest: "idle" | "pending";
}

type CleanEditorState = HydratedEditorData & {
  readonly phase: "clean";
  readonly saveError: null;
};

type DirtyEditorState = HydratedEditorData & {
  readonly phase: "dirty";
  readonly saveError: null;
};

type SavingEditorState = HydratedEditorData & {
  readonly phase: "saving";
  readonly saveError: null;
};

type ErrorEditorState = HydratedEditorData & {
  readonly phase: "error";
  readonly saveError: string;
};

type ConflictEditorState = HydratedEditorData & {
  readonly phase: "conflict";
  readonly saveError: string;
};

export type SquadEditorState =
  | { readonly phase: "loading"; readonly visibilityRequest: "idle" }
  | CleanEditorState
  | DirtyEditorState
  | SavingEditorState
  | ErrorEditorState
  | ConflictEditorState;

type HydratedSquadEditorState = Exclude<
  SquadEditorState,
  { readonly phase: "loading" }
>;

type SquadEditorVisibilityEvent = Extract<
  SquadEditorEvent,
  {
    readonly type:
      | "visibilityChangeStarted"
      | "visibilityChanged"
      | "visibilityChangeFailed";
  }
>;

export type SquadEditorEvent =
  | { readonly type: "detailLoaded"; readonly detail: SquadGroupDetail }
  | { readonly type: "draftChanged"; readonly draft: SquadGroupDraft }
  | { readonly type: "saveStarted"; readonly draft: SquadGroupDraft }
  | { readonly type: "saveSucceeded"; readonly detail: SquadGroupDetail }
  | { readonly type: "saveFailed"; readonly message: string }
  | { readonly type: "saveConflicted"; readonly message: string }
  | { readonly type: "reloadLatest" }
  | { readonly type: "visibilityChangeStarted" }
  | {
      readonly type: "visibilityChanged";
      readonly visibility: SquadEditorVisibility;
    }
  | { readonly type: "visibilityChangeFailed" };

export const initialSquadEditorState: SquadEditorState = {
  phase: "loading",
  visibilityRequest: "idle",
};

const hydrateState = (detail: SquadGroupDetail): CleanEditorState => {
  const draft = hydrateDraft(detail);
  return {
    draft,
    phase: "clean",
    saveError: null,
    savedSnapshot: draft,
    updatedAt: detail.updatedAt,
    visibility: detail.visibility,
    visibilityRequest: "idle",
  };
};

const stateAfterDraftChange = (
  state: HydratedSquadEditorState,
  draft: SquadGroupDraft
): CleanEditorState | DirtyEditorState => {
  if (isDraftEqual(draft, state.savedSnapshot)) {
    return {
      ...state,
      draft,
      phase: "clean",
      saveError: null,
    };
  }

  return {
    ...state,
    draft,
    phase: "dirty",
    saveError: null,
  };
};

const handleDetailLoaded = (
  state: SquadEditorState,
  detail: SquadGroupDetail
): SquadEditorState => {
  if (state.phase !== "loading" && state.draft.groupId !== detail.groupId) {
    return hydrateState(detail);
  }
  if (state.phase !== "loading" && state.phase !== "clean") {
    return state;
  }
  if (
    state.phase !== "loading" &&
    detail.updatedAt.getTime() <= state.updatedAt.getTime()
  ) {
    return state;
  }
  return hydrateState(detail);
};

const handleSaveStarted = (
  state: SquadEditorState,
  draft: SquadGroupDraft
): SquadEditorState => {
  if (
    state.phase === "loading" ||
    state.phase === "clean" ||
    state.phase === "saving" ||
    state.visibilityRequest === "pending"
  ) {
    return state;
  }
  return { ...state, draft, phase: "saving", saveError: null };
};

const handleSaveResult = (
  state: SquadEditorState,
  phase: "error" | "conflict",
  message: string
): SquadEditorState =>
  state.phase === "saving" ? { ...state, phase, saveError: message } : state;

const handleVisibilityEvent = (
  state: SquadEditorState,
  event: SquadEditorVisibilityEvent
): SquadEditorState => {
  if (state.phase === "loading" || state.phase === "saving") {
    return state;
  }
  switch (event.type) {
    case "visibilityChangeStarted": {
      return { ...state, visibilityRequest: "pending" };
    }
    case "visibilityChanged": {
      return {
        ...state,
        visibility: event.visibility,
        visibilityRequest: "idle",
      };
    }
    case "visibilityChangeFailed": {
      return { ...state, visibilityRequest: "idle" };
    }
    default: {
      return state;
    }
  }
};

export const squadEditorReducer = (
  state: SquadEditorState,
  event: SquadEditorEvent
): SquadEditorState => {
  switch (event.type) {
    case "detailLoaded": {
      return handleDetailLoaded(state, event.detail);
    }
    case "draftChanged": {
      return state.phase === "loading" || state.phase === "saving"
        ? state
        : stateAfterDraftChange(state, event.draft);
    }
    case "saveStarted": {
      return handleSaveStarted(state, event.draft);
    }
    case "saveSucceeded": {
      return state.phase === "saving" ? hydrateState(event.detail) : state;
    }
    case "saveFailed": {
      return handleSaveResult(state, "error", event.message);
    }
    case "saveConflicted": {
      return handleSaveResult(state, "conflict", event.message);
    }
    case "reloadLatest": {
      return initialSquadEditorState;
    }
    case "visibilityChangeStarted":
    case "visibilityChanged":
    case "visibilityChangeFailed": {
      return handleVisibilityEvent(state, event);
    }
    default: {
      return state;
    }
  }
};
