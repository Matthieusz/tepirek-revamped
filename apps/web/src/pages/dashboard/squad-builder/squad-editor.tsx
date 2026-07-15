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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import {
  availableSquadCharactersAtom,
  saveSharedSquadGroupCharactersAtom,
  saveSquadGroupAtom,
  setSquadGroupVisibilityAtom,
  squadGroupDetailAtom,
} from "@/lib/squad-builder/squad-group-atoms";
import type { AvailableSquadCharacter } from "@/lib/squad-builder/squad-group-atoms";
import { SquadEditorLayout } from "@/pages/dashboard/squad-builder/squad-editor/squad-editor-layout";
import {
  hydrateDraft,
  isDraftEqual,
  projectEditorPayload,
  projectOwnerPayload,
  removeCharacter,
} from "@/pages/dashboard/squad-builder/squad-editor/squad-group-draft";
import type { SquadGroupDraft } from "@/pages/dashboard/squad-builder/squad-editor/squad-group-draft";
import type { SquadCharacterMetadata } from "@/pages/dashboard/squad-builder/squad-editor/squad-roster-workspace";

// Kept as a named alias so route resource states and child props share one source type.
type SquadGroupDetail = typeof SquadGroupDetailSchema.Type;

const makeClientKey = (): string => `new-${crypto.randomUUID()}`;

const DetailSkeleton = () => (
  <div aria-hidden="true" className="space-y-5">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-64" />
      <div className="ml-auto flex items-center gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_28rem]">
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

const availableCharacterMetadata = (
  character: AvailableSquadCharacter
): SquadCharacterMetadata => ({
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

interface SquadBuilderEditorContentProps {
  readonly groupId: number;
}

interface SquadEditorState {
  readonly draft: SquadGroupDraft | null;
  readonly savedSnapshot: SquadGroupDraft | null;
  readonly visibility: "private" | "global";
}

const initialSquadEditorState: SquadEditorState = {
  draft: null,
  savedSnapshot: null,
  visibility: "private",
};

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
  const availableCharactersAtom = availableSquadCharactersAtom({
    groupId: canEditPlacements ? groupId : 0,
  });
  const availableCharactersResult = useAtomValue(availableCharactersAtom);
  const [editorState, setEditorState] = useState(initialSquadEditorState);
  const { draft, savedSnapshot, visibility } = editorState;
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [isVisibilityPending, setIsVisibilityPending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const hydratedUpdatedAtRef = useRef<number | null>(null);

  const isDirty =
    draft !== null &&
    savedSnapshot !== null &&
    !isDraftEqual(draft, savedSnapshot);
  const draftRef = useRef(draft);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    draftRef.current = draft;
    isDirtyRef.current = isDirty;
  }, [draft, isDirty]);
  useEffectFormProtection(isDirty, isSaving);
  const saveSquadGroup = useAtomSet(saveSquadGroupAtom, { mode: "promise" });
  const saveSharedSquadGroupCharacters = useAtomSet(
    saveSharedSquadGroupCharactersAtom,
    { mode: "promise" }
  );
  const setSquadGroupVisibility = useAtomSet(setSquadGroupVisibilityAtom, {
    mode: "promise",
  });

  useEffect(() => {
    if (detail === undefined) {
      return;
    }

    const detailUpdatedAt = detail.updatedAt.getTime();
    const currentDraft = draftRef.current;
    const shouldHydrate =
      currentDraft === null ||
      currentDraft.groupId !== detail.groupId ||
      (!isDirtyRef.current && hydratedUpdatedAtRef.current !== detailUpdatedAt);
    if (!shouldHydrate) {
      return;
    }

    const nextDraft = hydrateDraft(detail);
    setEditorState({
      draft: nextDraft,
      savedSnapshot: nextDraft,
      visibility: detail.visibility,
    });
    hydratedUpdatedAtRef.current = detailUpdatedAt;
  }, [detail]);

  const characterById = useMemo(() => {
    const characters =
      detail === undefined
        ? new Map<number, SquadCharacterMetadata>()
        : new Map(detailCharacters(detail));

    if (AsyncResult.isSuccess(availableCharactersResult)) {
      for (const character of availableCharactersResult.value) {
        characters.set(
          character.characterId,
          availableCharacterMetadata(character)
        );
      }
    }

    return characters;
  }, [availableCharactersResult, detail]);

  const updateDraft = (nextDraft: SquadGroupDraft) => {
    setEditorState((current) => ({ ...current, draft: nextDraft }));
    setSaveError(null);
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
    updateDraft(removeCharacter(draft, characterId, true));
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
      setEditorState((current) => ({
        ...current,
        draft: normalizedDraft,
        savedSnapshot: normalizedDraft,
      }));
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

  const updateVisibility = async (nextVisibility: "private" | "global") => {
    if (!isOwner || isVisibilityPending || visibility === nextVisibility) {
      return;
    }

    setIsVisibilityPending(true);
    try {
      await setSquadGroupVisibility({ groupId, visibility: nextVisibility });
      setEditorState((current) => ({
        ...current,
        visibility: nextVisibility,
      }));
      toast.success("Widoczność została zmieniona");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Nie udało się zmienić widoczności"));
    } finally {
      setIsVisibilityPending(false);
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
    <SquadEditorLayout
      characterById={characterById}
      draft={draft}
      groupId={groupId}
      permissions={{ canEditPlacements, isOwner, isViewer }}
      status={{ isDirty, isSaving, isSharingOpen, isVisibilityPending }}
      onAddSquad={addSquad}
      onDraftChange={updateDraft}
      onNameChange={(name) => {
        if (isOwner) {
          updateDraft({ ...draft, name });
        }
      }}
      onRemoveCharacter={removeDraftCharacter}
      onRemoveSquad={deleteSquad}
      onSave={() => {
        void save();
      }}
      onShareToggle={() => {
        setIsSharingOpen((current) => !current);
      }}
      onSquadNameChange={updateSquadName}
      onVisibilityChange={(nextVisibility) => {
        void updateVisibility(nextVisibility);
      }}
      role={role}
      saveError={saveError}
      visibility={visibility}
    />
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
