import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { useParams } from "@tanstack/react-router";
import type { SquadGroupDetailSchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  availableSquadCharactersAtom,
  saveSharedSquadGroupCharactersAtom,
  saveSquadGroupAtom,
  setSquadGroupVisibilityAtom,
  squadGroupDetailAtom,
} from "@/features/squad-builder/squad-group-atoms";
import type { AvailableSquadCharacter } from "@/features/squad-builder/squad-group-atoms";
import { getErrorMessage } from "@/lib/errors";
import { SquadEditorLayout } from "@/routes/dashboard/squad-builder/-components/squad-editor/squad-editor-layout";
import type { SquadCharacterMetadata } from "@/routes/dashboard/squad-builder/-components/squad-editor/squad-roster-workspace";
import {
  hydrateDraft,
  isDraftEqual,
  projectEditorPayload,
  projectOwnerPayload,
  removeCharacter,
} from "@/routes/dashboard/squad-builder/-state/squad-group-draft";
import type { SquadGroupDraft } from "@/routes/dashboard/squad-builder/-state/squad-group-draft";

// Kept as a named alias so route resource states and child props share one source type.
type SquadGroupDetail = SquadGroupDetailSchema;

const decodeSquadGroupId = Schema.decodeUnknownOption(
  Schema.FiniteFromString.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isGreaterThan(0))
  )
);

const makeClientKey = (): string => `new-${crypto.randomUUID()}`;

const detailCharacters = (
  detail: SquadGroupDetail
): HashMap.HashMap<number, SquadCharacterMetadata> =>
  HashMap.fromIterable(
    detail.squads.flatMap((squad) =>
      squad.characters.map(
        (character) =>
          [
            character.characterId,
            {
              accountDisplayName: character.accountDisplayName,
              accountId: character.accountId,
              accountOwnerUserImage: character.accountOwnerUserImage,
              accountOwnerUserName: character.accountOwnerUserName,
              avatarUrl: character.avatarUrl,
              characterId: character.characterId,
              level: character.level,
              name: character.name,
              profession: character.profession,
            },
          ] as const
      )
    )
  );

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
  readonly updatedAt: Date | null;
  readonly visibility: "private" | "global";
}

const initialSquadEditorState: SquadEditorState = {
  draft: null,
  savedSnapshot: null,
  updatedAt: null,
  visibility: "private",
};

const isSquadBuilderConflict = (error: unknown): boolean =>
  Predicate.isTagged(error, "SquadBuilderConflict");

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
  const { draft, savedSnapshot, updatedAt, visibility } = editorState;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVisibilityPending, setIsVisibilityPending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaveConflict, setIsSaveConflict] = useState(false);
  const isSavingRef = useRef(false);
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
      updatedAt: detail.updatedAt,
      visibility: detail.visibility,
    });
    hydratedUpdatedAtRef.current = detailUpdatedAt;
  }, [detail]);

  const characterById = useMemo(() => {
    let characters =
      detail === undefined
        ? HashMap.empty<number, SquadCharacterMetadata>()
        : detailCharacters(detail);

    if (AsyncResult.isSuccess(availableCharactersResult)) {
      for (const character of availableCharactersResult.value) {
        characters = HashMap.set(
          characters,
          character.characterId,
          availableCharacterMetadata(character)
        );
      }
    }

    return characters;
  }, [availableCharactersResult, detail]);

  const updateDraft = (nextDraft: SquadGroupDraft) => {
    if (isSavingRef.current) {
      return;
    }
    setEditorState((current) => ({ ...current, draft: nextDraft }));
    setSaveError(null);
    setIsSaveConflict(false);
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
    if (draft === null || updatedAt === null || isViewer || isSaving) {
      return;
    }
    const trimmedName = draft.name.trim();
    if (isOwner && trimmedName.length === 0) {
      toast.error("Podaj nazwę grupy");
      return;
    }

    setIsSaving(true);
    isSavingRef.current = true;
    setSaveError(null);
    setIsSaveConflict(false);
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
      const savedDetail = await (role === "editor"
        ? saveSharedSquadGroupCharacters({
            ...projectEditorPayload(normalizedDraft),
            expectedUpdatedAt: updatedAt,
          })
        : saveSquadGroup({
            ...projectOwnerPayload(normalizedDraft),
            expectedUpdatedAt: updatedAt,
          }));
      const nextDraft = hydrateDraft(savedDetail);
      setEditorState((current) => ({
        ...current,
        draft: nextDraft,
        savedSnapshot: nextDraft,
        updatedAt: savedDetail.updatedAt,
        visibility: savedDetail.visibility,
      }));
      hydratedUpdatedAtRef.current = savedDetail.updatedAt.getTime();
      toast.success("Grupa składów została zapisana");
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Nie udało się zapisać grupy składów"
      );
      setSaveError(message);
      setIsSaveConflict(isSquadBuilderConflict(error));
      toast.error(message);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const reloadLatest = () => {
    setSaveError(null);
    setIsSaveConflict(false);
    setEditorState((current) => ({
      ...current,
      draft: null,
      savedSnapshot: null,
      updatedAt: null,
    }));
    refreshDetail();
  };

  const updateVisibility = async (nextVisibility: "private" | "global") => {
    if (
      !isOwner ||
      isSaving ||
      isVisibilityPending ||
      visibility === nextVisibility
    ) {
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
    return <LoadingSpinner />;
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
    return <LoadingSpinner />;
  }

  return (
    <SquadEditorLayout
      characterById={characterById}
      draft={draft}
      groupId={groupId}
      permissions={{ canEditPlacements, isOwner, isViewer }}
      status={{ isDirty, isSaving, isSettingsOpen, isVisibilityPending }}
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
      onSettingsToggle={() => {
        setIsSettingsOpen((current) => !current);
      }}
      onSquadNameChange={updateSquadName}
      onVisibilityChange={(nextVisibility) => {
        void updateVisibility(nextVisibility);
      }}
      role={role}
      isSaveConflict={isSaveConflict}
      onReloadLatest={reloadLatest}
      saveError={saveError}
      visibility={visibility}
    />
  );
};

export default function SquadBuilderEditorPage() {
  const params = useParams({
    from: "/dashboard/squad-builder/squads_/$groupId",
  });
  const groupId = decodeSquadGroupId(params.groupId);

  if (Option.isNone(groupId)) {
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

  return <SquadBuilderEditorContent groupId={groupId.value} />;
}
