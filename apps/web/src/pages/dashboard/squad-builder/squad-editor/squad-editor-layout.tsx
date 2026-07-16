import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Frame, FramePanel } from "@/components/reui/frame";
import { AvailableCharacterPool } from "@/pages/dashboard/squad-builder/squad-editor/available-character-pool";
import { SquadEditorCommandHeader } from "@/pages/dashboard/squad-builder/squad-editor/squad-editor-command-header";
import type { SquadGroupDraft } from "@/pages/dashboard/squad-builder/squad-editor/squad-group-draft";
import { SquadGroupSettings } from "@/pages/dashboard/squad-builder/squad-editor/squad-group-settings";
import { SquadRosterWorkspace } from "@/pages/dashboard/squad-builder/squad-editor/squad-roster-workspace";
import type { SquadCharacterMetadata } from "@/pages/dashboard/squad-builder/squad-editor/squad-roster-workspace";

interface SquadEditorLayoutProps {
  readonly characterById: ReadonlyMap<number, SquadCharacterMetadata>;
  readonly draft: SquadGroupDraft;
  readonly groupId: number;
  readonly permissions: {
    readonly canEditPlacements: boolean;
    readonly isOwner: boolean;
    readonly isViewer: boolean;
  };
  readonly status: {
    readonly isDirty: boolean;
    readonly isSaving: boolean;
    readonly isSharingOpen: boolean;
    readonly isVisibilityPending: boolean;
  };
  readonly onAddSquad: () => void;
  readonly onDraftChange: (draft: SquadGroupDraft) => void;
  readonly onNameChange: (name: string) => void;
  readonly onRemoveCharacter: (characterId: number) => void;
  readonly onRemoveSquad: (squadKey: string) => void;
  readonly onSave: () => void;
  readonly onShareToggle: () => void;
  readonly onSquadNameChange: (squadKey: string, name: string) => void;
  readonly onVisibilityChange: (visibility: "private" | "global") => void;
  readonly role: "owner" | "editor" | "viewer";
  readonly isSaveConflict: boolean;
  readonly onReloadLatest: () => void;
  readonly saveError: string | null;
  readonly visibility: "private" | "global";
}

const roleDescription = (role: "editor" | "viewer") =>
  role === "editor"
    ? "Możesz zmieniać pozycje postaci w istniejących składach. Nazwa, składy, widoczność i dostęp pozostają pod kontrolą właściciela."
    : "Oglądasz tę grupę w trybie tylko do odczytu. Mutujące akcje są ukryte.";

/** Renders the hydrated squad editor workspace. */
export const SquadEditorLayout = ({
  characterById,
  draft,
  groupId,
  permissions,
  status,
  onAddSquad,
  onDraftChange,
  onNameChange,
  onRemoveCharacter,
  onRemoveSquad,
  onSave,
  onShareToggle,
  onSquadNameChange,
  onVisibilityChange,
  role,
  isSaveConflict,
  onReloadLatest,
  saveError,
  visibility,
}: SquadEditorLayoutProps) => {
  const { canEditPlacements, isOwner, isViewer } = permissions;
  const { isDirty, isSaving, isSharingOpen, isVisibilityPending } = status;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <SquadEditorCommandHeader
        draft={draft}
        onNameChange={onNameChange}
        onSave={onSave}
        onShareToggle={onShareToggle}
        onVisibilityChange={onVisibilityChange}
        role={role}
        isSaveConflict={isSaveConflict}
        onReloadLatest={onReloadLatest}
        saveError={saveError}
        state={{ isDirty, isSaving, isSharingOpen, isVisibilityPending }}
        variant={isViewer ? "viewer" : "editor"}
        visibility={visibility}
      />

      {isOwner && isSharingOpen && <SquadGroupSettings groupId={groupId} />}

      {!isOwner && (
        <Alert variant={isViewer ? "default" : "info"}>
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>
            {isViewer ? "Tryb tylko do odczytu" : "Uprawnienia edytora"}
          </AlertTitle>
          <AlertDescription>
            {roleDescription(role === "editor" ? "editor" : "viewer")}
          </AlertDescription>
        </Alert>
      )}

      <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
        <FramePanel className="p-0 shadow-none">
          <div className="grid gap-5 p-3 xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_28rem] xl:p-4">
            <div className="order-2 min-w-0 xl:order-1">
              <SquadRosterWorkspace
                canEditPlacements={canEditPlacements}
                characterById={characterById}
                draft={draft}
                isSaving={isSaving}
                isOwner={isOwner}
                onAddSquad={onAddSquad}
                onNameChange={onSquadNameChange}
                onRemoveCharacter={onRemoveCharacter}
                onRemoveSquad={onRemoveSquad}
              />
            </div>
            <div className="order-1 flex min-h-0 min-w-0 xl:order-2">
              {canEditPlacements ? (
                <AvailableCharacterPool
                  characterById={characterById}
                  draft={draft}
                  groupId={groupId}
                  isSaving={isSaving}
                  key={groupId}
                  onDraftChange={onDraftChange}
                />
              ) : (
                <div className="flex items-start">
                  <Alert className="w-full" variant="info">
                    <AlertTitle>Brak puli do edycji</AlertTitle>
                    <AlertDescription>
                      Właściciel lub edytor może zmieniać przydział postaci w
                      tej grupie.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </FramePanel>
      </Frame>
    </div>
  );
};
