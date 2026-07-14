import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useParams } from "@tanstack/react-router";
import type { SquadGroupDetailSchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useEffectFormProtection } from "@/components/forms/effect-form";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import {
  saveSharedSquadGroupCharactersAtom,
  saveSquadGroupAtom,
  squadGroupDetailAtom,
} from "@/lib/squad-builder/squad-group-atoms";
import { AvailableCharacterPool } from "@/pages/dashboard/squad-builder/squad-editor/available-character-pool";
import { SquadEditorCommandHeader } from "@/pages/dashboard/squad-builder/squad-editor/squad-editor-command-header";
import {
  hydrateDraft,
  isDraftEqual,
  projectEditorPayload,
  projectOwnerPayload,
  removeCharacter,
} from "@/pages/dashboard/squad-builder/squad-editor/squad-group-draft";
import type { SquadGroupDraft } from "@/pages/dashboard/squad-builder/squad-editor/squad-group-draft";
import { SquadGroupSettings } from "@/pages/dashboard/squad-builder/squad-editor/squad-group-settings";
import { SquadRosterWorkspace } from "@/pages/dashboard/squad-builder/squad-editor/squad-roster-workspace";
import type { SquadCharacterMetadata } from "@/pages/dashboard/squad-builder/squad-editor/squad-roster-workspace";

// Kept as a named alias so route resource states and child props share one source type.
type SquadGroupDetail = typeof SquadGroupDetailSchema.Type;

const makeClientKey = (): string => `new-${crypto.randomUUID()}`;

const DetailSkeleton = () => (
  <div aria-hidden="true" className="space-y-5">
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-20" />
      <Skeleton className="h-10 w-64" />
      <Skeleton className="ml-auto h-9 w-24" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  </div>
);

const detailCharacters = (
  detail: SquadGroupDetail
): ReadonlyMap<number, SquadCharacterMetadata> => {
  const characters = new Map<number, SquadCharacterMetadata>();
  for (const squad of detail.squads) {
    for (const character of squad.characters) {
      characters.set(character.characterId, {
        accountDisplayName: character.accountDisplayName,
        accountId: character.accountId,
        accountOwnerUserImage: character.accountOwnerUserImage,
        accountOwnerUserName: character.accountOwnerUserName,
        avatarUrl: character.avatarUrl,
        characterId: character.characterId,
        level: character.level,
        name: character.name,
        profession: character.profession,
      });
    }
  }
  return characters;
};

const roleDescription = (role: "editor" | "viewer") =>
  role === "editor"
    ? "Możesz zmieniać pozycje postaci w istniejących składach. Nazwa, składy, widoczność i dostęp pozostają pod kontrolą właściciela."
    : "Oglądasz tę grupę w trybie tylko do odczytu. Mutujące akcje są ukryte.";

interface SquadBuilderEditorContentProps {
  readonly groupId: number;
}

// oxlint-disable-next-line complexity
const SquadBuilderEditorContent = ({
  groupId,
}: SquadBuilderEditorContentProps) => {
  const detailAtom = squadGroupDetailAtom({ groupId });
  const detailResult = useAtomValue(detailAtom);
  const refreshDetail = useAtomRefresh(detailAtom);
  const detail = AsyncResult.isSuccess(detailResult)
    ? detailResult.value
    : undefined;
  const role = detail?.accessRole ?? "viewer";
  const isOwner = role === "owner";
  const isViewer = role === "viewer";
  const canEditPlacements = isOwner || role === "editor";
  const [draft, setDraft] = useState<SquadGroupDraft | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SquadGroupDraft | null>(
    null
  );
  const [visibility, setVisibility] = useState<"private" | "global">("private");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [placementStatus, setPlacementStatus] = useState("");
  const hydratedUpdatedAtRef = useRef<number | null>(null);

  const isDirty =
    draft !== null &&
    savedSnapshot !== null &&
    !isDraftEqual(draft, savedSnapshot);
  useEffectFormProtection(isDirty, isSaving);
  const saveSquadGroup = useAtomSet(saveSquadGroupAtom, { mode: "promise" });
  const saveSharedSquadGroupCharacters = useAtomSet(
    saveSharedSquadGroupCharactersAtom,
    { mode: "promise" }
  );

  useEffect(() => {
    if (detail === undefined) {
      return;
    }

    const detailUpdatedAt = detail.updatedAt.getTime();
    const shouldHydrate =
      draft === null ||
      draft.groupId !== detail.groupId ||
      (!isDirty && hydratedUpdatedAtRef.current !== detailUpdatedAt);
    if (!shouldHydrate) {
      return;
    }

    const nextDraft = hydrateDraft(detail);
    setDraft(nextDraft);
    setSavedSnapshot(nextDraft);
    setVisibility(detail.visibility);
    hydratedUpdatedAtRef.current = detailUpdatedAt;
  }, [detail, draft, isDirty]);

  const characterById = useMemo(
    () => (detail === undefined ? new Map() : detailCharacters(detail)),
    [detail]
  );

  const updateDraft = (nextDraft: SquadGroupDraft, status = "") => {
    setDraft(nextDraft);
    setSaveError(null);
    if (status.length > 0) {
      setPlacementStatus(status);
    }
  };

  const addSquad = () => {
    if (draft === null || !isOwner) {
      return;
    }
    updateDraft({
      ...draft,
      squads: [
        ...draft.squads,
        {
          characters: [],
          clientKey: makeClientKey(),
          name: `Skład ${draft.squads.length + 1}`,
        },
      ],
    });
  };

  const updateSquadName = (squadKey: string, name: string) => {
    if (draft === null || !isOwner) {
      return;
    }
    updateDraft({
      ...draft,
      squads: draft.squads.map((squad) =>
        squad.clientKey === squadKey ? { ...squad, name } : squad
      ),
    });
  };

  const deleteSquad = (squadKey: string) => {
    if (draft === null || !isOwner) {
      return;
    }
    updateDraft({
      ...draft,
      squads: draft.squads.filter((squad) => squad.clientKey !== squadKey),
    });
  };

  const removeDraftCharacter = (characterId: number) => {
    if (draft === null || !canEditPlacements) {
      return;
    }
    updateDraft(
      removeCharacter(draft, characterId, true),
      "Postać została usunięta ze składu."
    );
  };

  const save = async () => {
    if (draft === null || isViewer || isSaving) {
      return;
    }
    const trimmedName = draft.name.trim();
    if (isOwner && trimmedName.length === 0) {
      toast.error("Podaj nazwę grupy");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    const normalizedDraft: SquadGroupDraft = isOwner
      ? {
          ...draft,
          name: trimmedName,
          squads: draft.squads.map((squad) => ({
            ...squad,
            name: squad.name.trim(),
          })),
        }
      : draft;
    try {
      await (role === "editor"
        ? saveSharedSquadGroupCharacters(projectEditorPayload(normalizedDraft))
        : saveSquadGroup(projectOwnerPayload(normalizedDraft)));
      setDraft(normalizedDraft);
      setSavedSnapshot(normalizedDraft);
      setPlacementStatus("");
      toast.success("Grupa składów została zapisana");
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Nie udało się zapisać grupy składów"
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (AsyncResult.isInitial(detailResult)) {
    return <DetailSkeleton />;
  }

  if (AsyncResult.isFailure(detailResult)) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Nie udało się wczytać grupy składów</AlertTitle>
          <AlertDescription>
            Grupa może być niedostępna albo nie masz do niej dostępu.
          </AlertDescription>
          <AlertAction>
            <Button
              onClick={refreshDetail}
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCw className="size-3.5" />
              Spróbuj ponownie
            </Button>
          </AlertAction>
        </Alert>
      </div>
    );
  }

  if (draft === null || detail === undefined) {
    return <DetailSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <SquadEditorCommandHeader
        draft={draft}
        isDirty={isDirty}
        isSaving={isSaving}
        isViewer={isViewer}
        onNameChange={(name) => {
          if (isOwner) {
            updateDraft({ ...draft, name });
          }
        }}
        onSave={() => {
          void save();
        }}
        role={role}
        saveError={saveError}
        visibility={visibility}
      />

      {!isOwner && (
        <Alert variant={isViewer ? "default" : "info"}>
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>
            {isViewer ? "Tryb tylko do odczytu" : "Uprawnienia edytora"}
          </AlertTitle>
          <AlertDescription>{roleDescription(role)}</AlertDescription>
        </Alert>
      )}

      <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
        <FramePanel className="p-0 shadow-none">
          <div className="grid gap-5 p-3 xl:grid-cols-[minmax(0,1fr)_22rem] xl:p-4">
            <div className="order-2 min-w-0 xl:order-1">
              <SquadRosterWorkspace
                canEditPlacements={canEditPlacements}
                characterById={characterById}
                draft={draft}
                isOwner={isOwner}
                onAddSquad={addSquad}
                onNameChange={updateSquadName}
                onRemoveCharacter={removeDraftCharacter}
                onRemoveSquad={deleteSquad}
              />
            </div>
            <div className="order-1 min-w-0 xl:order-2">
              {canEditPlacements ? (
                <AvailableCharacterPool
                  characterById={characterById}
                  draft={draft}
                  groupId={groupId}
                  onDraftChange={(nextDraft) =>
                    updateDraft(
                      nextDraft,
                      "Przydział postaci został zmieniony."
                    )
                  }
                  onRemoveCharacter={removeDraftCharacter}
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

      {placementStatus.length > 0 && (
        <output aria-live="polite" className="text-muted-foreground text-sm">
          {placementStatus}
        </output>
      )}

      {isOwner && (
        <SquadGroupSettings
          groupId={groupId}
          onVisibilityChange={setVisibility}
          visibility={visibility}
        />
      )}
    </div>
  );
};

export default function SquadBuilderEditorPage() {
  const params = useParams({
    from: "/dashboard/squad-builder/squads_/$groupId",
  });
  const groupId = Number(params.groupId);

  if (!Number.isSafeInteger(groupId) || groupId <= 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Nieprawidłowy identyfikator grupy składów</AlertTitle>
        <AlertDescription>
          <a
            className="underline underline-offset-4"
            href="/dashboard/squad-builder/squads"
          >
            Wróć do listy grup.
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  return <SquadBuilderEditorContent groupId={groupId} />;
}
