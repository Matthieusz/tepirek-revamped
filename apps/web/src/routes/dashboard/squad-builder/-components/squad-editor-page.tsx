import { Rotate01Icon, TriangleAlertIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import type { SquadGroupDetailSchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import * as HashMap from "effect/HashMap";
import * as Predicate from "effect/Predicate";
import { useEffect, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { AvailableSquadCharacter } from "@/features/squad-builder/squad-group-api";
import {
  availableSquadCharactersQueryOptions,
  saveSharedSquadGroupCharactersMutationOptions,
  saveSquadGroupMutationOptions,
  setSquadGroupVisibilityMutationOptions,
  squadGroupDetailQueryOptions,
} from "@/features/squad-builder/squad-group-queries";
import { getErrorMessage } from "@/lib/errors";
import type { CaughtError } from "@/lib/errors";
import { SquadEditorLayout } from "@/routes/dashboard/squad-builder/-components/squad-editor/squad-editor-layout";
import type { SquadCharacterMetadata } from "@/routes/dashboard/squad-builder/-components/squad-editor/squad-roster-workspace";
import {
  initialSquadEditorState,
  squadEditorReducer,
} from "@/routes/dashboard/squad-builder/-state/squad-editor-state";
import {
  projectEditorPayload,
  projectOwnerPayload,
  removeCharacter,
} from "@/routes/dashboard/squad-builder/-state/squad-group-draft";
import type { SquadGroupDraft } from "@/routes/dashboard/squad-builder/-state/squad-group-draft";

// Kept as a named alias so route resource states and child props share one source type.
type SquadGroupDetail = SquadGroupDetailSchema;

const routeApi = getRouteApi("/dashboard/squad-builder/squads_/$groupId");

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

const isSquadBuilderConflict = (error: CaughtError): boolean =>
  Predicate.isTagged(error, "SquadBuilderConflict");

const SquadBuilderEditorContent = ({
  groupId,
}: SquadBuilderEditorContentProps) => {
  const queryClient = useQueryClient();
  const detailQuery = useQuery(squadGroupDetailQueryOptions(groupId));
  const detail = detailQuery.data;
  const role = detail?.accessRole ?? "viewer";
  const isOwner = role === "owner";
  const isViewer = role === "viewer";
  const canEditPlacements = isOwner || role === "editor";
  const availableCharactersQuery = useQuery({
    ...availableSquadCharactersQueryOptions(groupId),
    enabled: canEditPlacements,
  });
  const [editorState, dispatchEditor] = useReducer(
    squadEditorReducer,
    initialSquadEditorState
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isLoading = editorState.phase === "loading";
  const isSaving = editorState.phase === "saving";
  const isDirty =
    editorState.phase === "dirty" ||
    editorState.phase === "error" ||
    editorState.phase === "conflict";
  const draft = isLoading ? null : editorState.draft;
  const updatedAt = isLoading ? null : editorState.updatedAt;
  const visibility = isLoading ? "private" : editorState.visibility;
  const isVisibilityPending = editorState.visibilityRequest === "pending";
  const saveError =
    editorState.phase === "error" || editorState.phase === "conflict"
      ? editorState.saveError
      : null;
  const isSaveConflict = editorState.phase === "conflict";
  const saveSquadGroup = useMutation(
    saveSquadGroupMutationOptions(queryClient)
  );
  const saveSharedSquadGroupCharacters = useMutation(
    saveSharedSquadGroupCharactersMutationOptions(queryClient)
  );
  const setSquadGroupVisibility = useMutation(
    setSquadGroupVisibilityMutationOptions(queryClient)
  );

  useEffect(() => {
    if (detail === undefined) {
      return;
    }

    dispatchEditor({ detail, type: "detailLoaded" });
  }, [detail]);

  const characterById = useMemo(() => {
    let characters =
      detail === undefined
        ? HashMap.empty<number, SquadCharacterMetadata>()
        : detailCharacters(detail);

    if (availableCharactersQuery.data !== undefined) {
      for (const character of availableCharactersQuery.data) {
        characters = HashMap.set(
          characters,
          character.characterId,
          availableCharacterMetadata(character)
        );
      }
    }

    return characters;
  }, [availableCharactersQuery.data, detail]);

  const updateDraft = (nextDraft: SquadGroupDraft) => {
    dispatchEditor({ draft: nextDraft, type: "draftChanged" });
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

    dispatchEditor({ draft, type: "saveStarted" });
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
        ? saveSharedSquadGroupCharacters.mutateAsync({
            ...projectEditorPayload(normalizedDraft),
            expectedUpdatedAt: updatedAt,
          })
        : saveSquadGroup.mutateAsync({
            ...projectOwnerPayload(normalizedDraft),
            expectedUpdatedAt: updatedAt,
          }));
      dispatchEditor({ detail: savedDetail, type: "saveSucceeded" });
      toast.success("Grupa składów została zapisana");
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        "Nie udało się zapisać grupy składów"
      );
      dispatchEditor({
        message,
        type: isSquadBuilderConflict(error) ? "saveConflicted" : "saveFailed",
      });
      toast.error(message);
    }
  };

  const reloadLatest = () => {
    dispatchEditor({ type: "reloadLatest" });
    void detailQuery.refetch();
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

    dispatchEditor({ type: "visibilityChangeStarted" });
    try {
      await setSquadGroupVisibility.mutateAsync({
        groupId,
        visibility: nextVisibility,
      });
      dispatchEditor({
        type: "visibilityChanged",
        visibility: nextVisibility,
      });
      toast.success("Widoczność została zmieniona");
    } catch (error: unknown) {
      dispatchEditor({ type: "visibilityChangeFailed" });
      toast.error(getErrorMessage(error, "Nie udało się zmienić widoczności"));
    }
  };

  if (detailQuery.isPending) {
    return <LoadingSpinner />;
  }

  if (detailQuery.isError) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <HugeiconsIcon icon={TriangleAlertIcon} aria-hidden="true" />
          <AlertTitle>Nie udało się wczytać grupy składów</AlertTitle>
          <AlertDescription>
            Grupa może być niedostępna albo nie masz do niej dostępu.
          </AlertDescription>
          <AlertAction>
            <Button
              onClick={() => {
                void detailQuery.refetch();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={Rotate01Icon}
                className="size-3.5"
              />
              Spróbuj ponownie
            </Button>
          </AlertAction>
        </Alert>
      </div>
    );
  }

  if (draft === null || detail === undefined || isLoading) {
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

const SquadBuilderEditorPage = () => {
  const { groupId } = routeApi.useLoaderData();

  if (groupId === null) {
    return (
      <Alert variant="destructive">
        <HugeiconsIcon icon={TriangleAlertIcon} aria-hidden="true" />
        <AlertTitle>Nieprawidłowy identyfikator grupy składów</AlertTitle>
        <AlertDescription>
          <Link
            className="underline underline-offset-4"
            to="/dashboard/squad-builder/squads"
          >
            Wróć do listy grup.
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return <SquadBuilderEditorContent groupId={groupId} />;
};

export default SquadBuilderEditorPage;
