import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { Link } from "@tanstack/react-router";
import type { SharedSquadGroupSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-group-sharing/squad-group-sharing-schema";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  AlertTriangle,
  ChevronRight,
  RotateCw,
  Search,
  Swords,
} from "lucide-react";
import { useState } from "react";

import { EffectForm, EffectFormFeedback } from "@/components/forms/effect-form";
import { EffectTextField } from "@/components/forms/effect-form-fields";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { IconStack } from "@/components/reui/icon-stack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OptionalLevelSchema,
  SquadFilterNameSchema,
  validateSquadFilterLevelOrder,
} from "@/lib/form-schemas";
import {
  globalSquadGroupsAtom,
  ownedSquadGroupsAtom,
} from "@/lib/squad-builder/squad-group-atoms";
import type {
  GlobalSquadGroupSummary,
  SquadGroupSummary,
} from "@/lib/squad-builder/squad-group-atoms";
import { sharedSquadGroupsAtom } from "@/lib/squad-builder/squad-group-sharing-atoms";
import { formatDateTime } from "@/lib/utils";

import {
  formatCharacterCount,
  formatSquadCount,
  userInitials,
} from "./squad-group-presenters";

type SharedSquadGroupSummary = typeof SharedSquadGroupSummarySchema.Type;
type SquadListTab = "mine" | "shared" | "public";

interface SquadGroupListFilterFormState {
  readonly nameQuery: string;
  readonly minLevel: string;
  readonly maxLevel: string;
}

const emptyFilterForm: SquadGroupListFilterFormState = {
  maxLevel: "",
  minLevel: "",
  nameQuery: "",
};
const PositiveLevelFromString = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);
const decodeOptionalLevel = (value: string): number | null =>
  Option.getOrNull(Schema.decodeUnknownOption(PositiveLevelFromString)(value));

const squadFilterFormBuilder = FormBuilder.empty
  .addField("nameQuery", SquadFilterNameSchema)
  .addField("minLevel", OptionalLevelSchema)
  .addField("maxLevel", OptionalLevelSchema)
  .refine(validateSquadFilterLevelOrder);

const squadFilterForm = FormReact.make(squadFilterFormBuilder, {
  fields: {
    maxLevel: EffectTextField,
    minLevel: EffectTextField,
    nameQuery: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (
    {
      onApply,
    }: { readonly onApply: (value: SquadGroupListFilterFormState) => void },
    { decoded }
  ) =>
    Effect.sync(() =>
      onApply({
        maxLevel: decoded.maxLevel.trim(),
        minLevel: decoded.minLevel.trim(),
        nameQuery: decoded.nameQuery.trim(),
      })
    ),
});

const hasActiveFilters = (filters: SquadGroupListFilterFormState): boolean =>
  filters.nameQuery.length > 0 ||
  filters.minLevel.length > 0 ||
  filters.maxLevel.length > 0;

interface SquadGroupListFiltersProps {
  readonly onApply: (filters: SquadGroupListFilterFormState) => void;
  readonly onClear: () => void;
}

const SquadGroupListFilters = ({
  onApply,
  onClear,
}: SquadGroupListFiltersProps) => {
  const submit = useAtomSet(squadFilterForm.submit);
  const reset = useAtomSet(squadFilterForm.reset);
  const submitResult = useAtomValue(squadFilterForm.submit);

  return (
    <squadFilterForm.Initialize defaultValues={emptyFilterForm}>
      <EffectForm
        action={() => submit({ onApply })}
        className="grid gap-3 border-b border-border px-4 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
        submitResult={submitResult}
      >
        <squadFilterForm.nameQuery
          className="space-y-2"
          label="Nazwa grupy"
          maxLength={80}
          placeholder="Szukaj po nazwie"
        />
        <squadFilterForm.minLevel
          className="space-y-2"
          label="Poziom od"
          placeholder="Od"
          type="number"
        />
        <squadFilterForm.maxLevel
          className="space-y-2"
          label="Poziom do"
          placeholder="Do"
          type="number"
        />
        <div className="flex gap-2">
          <Button disabled={submitResult.waiting} type="submit">
            <Search className="size-3.5" />
            Filtruj
          </Button>
          <Button
            disabled={submitResult.waiting}
            onClick={() => {
              reset();
              onClear();
            }}
            type="button"
            variant="ghost"
          >
            Wyczyść
          </Button>
        </div>
        <EffectFormFeedback result={submitResult} />
      </EffectForm>
    </squadFilterForm.Initialize>
  );
};

const CollectionSkeleton = () => (
  <ul aria-hidden="true" className="divide-y divide-border">
    {[0, 1, 2, 3].map((item) => (
      <li className="flex items-center gap-4 px-4 py-3" key={item}>
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-5 w-20" />
      </li>
    ))}
  </ul>
);

const CollectionFailure = ({ onRetry }: { readonly onRetry: () => void }) => (
  <Alert className="m-4" variant="destructive">
    <AlertTriangle aria-hidden="true" />
    <AlertTitle>Nie udało się wczytać grup</AlertTitle>
    <AlertDescription>
      Ta kolekcja nie jest teraz dostępna. Pozostałe zakładki nadal działają.
    </AlertDescription>
    <AlertAction>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        <RotateCw className="size-3.5" />
        Spróbuj ponownie
      </Button>
    </AlertAction>
  </Alert>
);

const CollectionEmpty = ({
  filtered,
  kind,
  onCreateGroup,
}: {
  readonly filtered: boolean;
  readonly kind: SquadListTab;
  readonly onCreateGroup: (() => void) | undefined;
}) => {
  let copy = "Nie ma jeszcze publicznych grup składów.";
  let icon = <Search className="size-5" />;
  if (kind === "mine") {
    copy =
      "Nie masz jeszcze grup składów. Utwórz pierwszą grupę i dodaj postacie z Jaruny.";
    icon = <Swords className="size-5" />;
  } else if (kind === "shared") {
    copy = "Zaakceptowane zaproszenia edytora pojawią się tutaj.";
  } else if (filtered) {
    copy = "Brak publicznych grup pasujących do filtrów.";
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <IconStack aria-hidden="true">{icon}</IconStack>
      <p className="max-w-md text-muted-foreground text-sm">{copy}</p>
      {kind === "mine" && onCreateGroup !== undefined && (
        <Button
          onClick={onCreateGroup}
          size="sm"
          type="button"
          variant="outline"
        >
          Utwórz pierwszą grupę
        </Button>
      )}
    </div>
  );
};

interface GroupRowProps {
  readonly group:
    | SquadGroupSummary
    | SharedSquadGroupSummary
    | GlobalSquadGroupSummary;
  readonly kind: SquadListTab;
}

const GroupRow = ({ group, kind }: GroupRowProps) => {
  const owner =
    kind === "mine"
      ? undefined
      : (group as SharedSquadGroupSummary | GlobalSquadGroupSummary);
  let status = "publiczny";
  if (kind === "mine") {
    status = "właściciel";
  } else if (kind === "shared") {
    status = "edytor";
  }

  return (
    <li>
      <Link
        aria-label={`Otwórz grupę składów ${group.name}`}
        className="group flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:gap-4"
        params={{ groupId: String(group.groupId) }}
        to="/dashboard/squad-builder/squads/$groupId"
      >
        {owner === undefined ? null : (
          <Avatar className="mt-0.5" size="sm">
            {owner.ownerUserImage ? (
              <AvatarImage
                alt={owner.ownerUserName}
                src={owner.ownerUserImage}
              />
            ) : null}
            <AvatarFallback>{userInitials(owner.ownerUserName)}</AvatarFallback>
          </Avatar>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">{group.name}</span>
            <Badge
              size="sm"
              variant={kind === "public" ? "info-light" : "secondary"}
            >
              {status}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground text-xs">
            {owner === undefined ? null : <span>{owner.ownerUserName}</span>}
            <span className="font-mono">
              {formatSquadCount(group.squadCount)}
            </span>
            {group.characterCount > 0 && (
              <span className="font-mono">
                {formatCharacterCount(group.characterCount)}
              </span>
            )}
            <span className="font-mono">
              Aktualizacja {formatDateTime(group.updatedAt)}
            </span>
          </div>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
};

interface CollectionPanelProps {
  readonly kind: SquadListTab;
  readonly onCreateGroup?: () => void;
  readonly onRetry: () => void;
  readonly result: AsyncResult.AsyncResult<
    readonly (
      | SquadGroupSummary
      | SharedSquadGroupSummary
      | GlobalSquadGroupSummary
    )[],
    unknown
  >;
  readonly filtered: boolean;
}

const CollectionPanel = ({
  filtered,
  kind,
  onCreateGroup,
  onRetry,
  result,
}: CollectionPanelProps) => {
  if (AsyncResult.isFailure(result)) {
    return <CollectionFailure onRetry={onRetry} />;
  }
  if (!AsyncResult.isSuccess(result)) {
    return <CollectionSkeleton />;
  }
  if (result.value.length === 0) {
    return (
      <CollectionEmpty
        filtered={filtered}
        kind={kind}
        onCreateGroup={onCreateGroup}
      />
    );
  }

  return (
    <ul className="divide-y divide-border" aria-label={`Lista: ${kind}`}>
      {result.value.map((group) => (
        <GroupRow group={group} key={group.groupId} kind={kind} />
      ))}
    </ul>
  );
};

interface SquadGroupLibraryProps {
  readonly onCreateGroup: () => void;
}

export const SquadGroupLibrary = ({
  onCreateGroup,
}: SquadGroupLibraryProps) => {
  const [activeTab, setActiveTab] = useState<SquadListTab>("mine");
  const [appliedFilters, setAppliedFilters] = useState(emptyFilterForm);
  const ownedResult = useAtomValue(ownedSquadGroupsAtom);
  const sharedResult = useAtomValue(sharedSquadGroupsAtom);
  const publicAtom = globalSquadGroupsAtom({
    maxLevel:
      appliedFilters.maxLevel.length > 0
        ? decodeOptionalLevel(appliedFilters.maxLevel)
        : null,
    minLevel:
      appliedFilters.minLevel.length > 0
        ? decodeOptionalLevel(appliedFilters.minLevel)
        : null,
    nameQuery:
      appliedFilters.nameQuery.length > 0 ? appliedFilters.nameQuery : null,
  });
  const publicResult = useAtomValue(publicAtom);
  const refreshOwned = useAtomRefresh(ownedSquadGroupsAtom);
  const refreshShared = useAtomRefresh(sharedSquadGroupsAtom);
  const refreshPublic = useAtomRefresh(publicAtom);
  const activeFilters = hasActiveFilters(appliedFilters);
  const ownedGroups = AsyncResult.isSuccess(ownedResult)
    ? ownedResult.value
    : [];
  const sharedGroups = AsyncResult.isSuccess(sharedResult)
    ? sharedResult.value
    : [];
  const publicGroups = AsyncResult.isSuccess(publicResult)
    ? publicResult.value
    : [];

  return (
    <Tabs
      onValueChange={(value) => setActiveTab(value as SquadListTab)}
      value={activeTab}
      className={"flex-col"}
    >
      <nav
        aria-label="Nawigacja kolekcji grup składów"
        className="max-w-full overflow-x-auto"
      >
        <TabsList
          aria-label="Kolekcje grup składów"
          className="max-w-full"
          variant="line"
        >
          <TabsTrigger value="mine">
            Moje <span className="font-mono text-xs">{ownedGroups.length}</span>
          </TabsTrigger>
          <TabsTrigger value="shared">
            Udostępnione{" "}
            <span className="font-mono text-xs">{sharedGroups.length}</span>
          </TabsTrigger>
          <TabsTrigger value="public">
            Publiczne{" "}
            <span className="font-mono text-xs">{publicGroups.length}</span>
          </TabsTrigger>
        </TabsList>
      </nav>
      <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
        <FramePanel className="p-0 shadow-none">
          <TabsContent aria-label="Moje grupy składów" value="mine">
            <CollectionPanel
              filtered={false}
              kind="mine"
              onCreateGroup={onCreateGroup}
              onRetry={refreshOwned}
              result={ownedResult}
            />
          </TabsContent>
          <TabsContent
            aria-label="Udostępnione mi grupy składów"
            value="shared"
          >
            <CollectionPanel
              filtered={false}
              kind="shared"
              onRetry={refreshShared}
              result={sharedResult}
            />
          </TabsContent>
          <TabsContent aria-label="Publiczne grupy składów" value="public">
            <SquadGroupListFilters
              onApply={setAppliedFilters}
              onClear={() => setAppliedFilters(emptyFilterForm)}
            />
            <CollectionPanel
              filtered={activeFilters}
              kind="public"
              onRetry={refreshPublic}
              result={publicResult}
            />
          </TabsContent>
        </FramePanel>
      </Frame>
    </Tabs>
  );
};
