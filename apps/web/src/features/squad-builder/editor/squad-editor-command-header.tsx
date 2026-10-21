import { Globe, Loader2, LockKeyhole, Save, Settings } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { SquadGroupDraft } from "@/features/squad-builder/editor/squad-group-draft";

interface SquadEditorCommandHeaderProps {
  readonly draft: SquadGroupDraft;
  readonly state: {
    readonly isDirty: boolean;
    readonly isSaving: boolean;
    readonly isSettingsOpen: boolean;
    readonly isVisibilityPending: boolean;
  };
  readonly variant: "editor" | "viewer";
  readonly saveError: string | null;
  readonly visibility: "private" | "global";
  readonly role: "owner" | "editor" | "viewer";
  readonly isSaveConflict: boolean;
  readonly onReloadLatest: () => void;
  readonly onNameChange: (name: string) => void;
  readonly onSave: () => void;
  readonly onVisibilityChange: (visibility: "private" | "global") => void;
}

const roleLabels = {
  editor: "edytor",
  owner: "właściciel",
  viewer: "tylko odczyt",
} as const;

const getSaveStatus = (
  isViewer: boolean,
  isSaving: boolean,
  isDirty: boolean
): string => {
  if (isViewer) {
    return "Możesz przeglądać zapisane składy.";
  }

  if (isSaving) {
    return "Zapisywanie";
  }

  if (isDirty) {
    return "Niezapisane zmiany";
  }

  return "Zapisano";
};

const SquadSaveActions = ({
  draft,
  state,
  variant,
  role,
  onSave,
}: Pick<
  SquadEditorCommandHeaderProps,
  "draft" | "state" | "variant" | "role" | "onSave"
>) => {
  const { isDirty, isSaving, isSettingsOpen } = state;
  const isViewer = variant === "viewer";

  if (isViewer) {
    return null;
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {role === "owner" && (
        <DialogTrigger
          render={<Button variant={isSettingsOpen ? "secondary" : "outline"} />}
        >
          <Settings aria-hidden="true" className="size-4" />
          Ustawienia
        </DialogTrigger>
      )}
      <div>
        <Button
          disabled={isSaving || !isDirty || draft.name.trim().length === 0}
          onClick={onSave}
          type="button"
        >
          {isSaving ? (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {isDirty && !isSaving
            ? "Zapisz"
            : getSaveStatus(false, isSaving, isDirty)}
        </Button>
      </div>
    </div>
  );
};

/** Renders group naming, permissions, save controls, and recoverable save errors. */
export const SquadEditorCommandHeader = ({
  draft,
  state,
  variant,
  onNameChange,
  onSave,
  onVisibilityChange,
  role,
  isSaveConflict,
  onReloadLatest,
  saveError,
  visibility,
}: SquadEditorCommandHeaderProps) => {
  const { isDirty, isSaving, isVisibilityPending } = state;
  const isViewer = variant === "viewer";

  const nameError =
    draft.name.trim().length === 0 ? "Podaj nazwę grupy." : null;

  return (
    <header className="space-y-3">
      <div className="bg-card rounded-xl border p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            {!isViewer && (
              <Label
                className="text-foreground/70 text-xs"
                htmlFor="group-name"
              >
                Nazwa grupy
              </Label>
            )}
            <h1
              className={
                isViewer
                  ? "font-serif text-2xl font-bold tracking-tight break-words"
                  : undefined
              }
            >
              {isViewer ? (
                draft.name
              ) : (
                <Input
                  aria-label="Nazwa grupy"
                  aria-invalid={nameError !== null}
                  aria-describedby={
                    nameError === null ? undefined : "group-name-error"
                  }
                  className="bg-background h-11 w-full max-w-xl px-3 font-sans text-lg font-semibold shadow-none"
                  disabled={isSaving}
                  id="group-name"
                  maxLength={80}
                  onChange={(event) => {
                    onNameChange(event.target.value);
                  }}
                  value={draft.name}
                />
              )}
            </h1>
            {!isViewer && nameError !== null && (
              <p id="group-name-error" role="alert">
                {nameError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:self-end">
            <SquadSaveActions
              draft={draft}
              state={state}
              variant={variant}
              role={role}
              onSave={onSave}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t pt-3">
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="secondary">{roleLabels[role]}</Badge>
            <div className="text-foreground/70 flex items-center gap-2">
              {visibility === "global" ? (
                <Globe aria-hidden="true" className="size-3.5" />
              ) : (
                <LockKeyhole aria-hidden="true" className="size-3.5" />
              )}
              {role === "owner" ? (
                <>
                  <Label className="text-xs" htmlFor="group-visibility-toggle">
                    Grupa publiczna
                  </Label>
                  <Switch
                    checked={visibility === "global"}
                    disabled={isSaving || isVisibilityPending}
                    id="group-visibility-toggle"
                    onCheckedChange={(checked) => {
                      onVisibilityChange(checked ? "global" : "private");
                    }}
                  />
                </>
              ) : (
                <span className="text-xs">
                  {visibility === "global"
                    ? "Grupa publiczna"
                    : "Grupa prywatna"}
                </span>
              )}
            </div>
          </div>
          <span
            aria-live="polite"
            className={`text-xs ${isDirty || saveError !== null ? "text-foreground font-medium" : "text-foreground/70"}`}
          >
            {saveError === null
              ? getSaveStatus(isViewer, isSaving, isDirty)
              : "Zmiany nie zostały zapisane"}
          </span>
        </div>
      </div>
      {saveError !== null && (
        <Alert variant="destructive">
          <AlertTitle>Nie udało się zapisać zmian</AlertTitle>
          <AlertDescription>{saveError}</AlertDescription>
          {isSaveConflict && (
            <AlertAction>
              <Button
                onClick={onReloadLatest}
                size="sm"
                type="button"
                variant="outline"
              >
                Wczytaj najnowszą wersję
              </Button>
            </AlertAction>
          )}
        </Alert>
      )}
    </header>
  );
};
