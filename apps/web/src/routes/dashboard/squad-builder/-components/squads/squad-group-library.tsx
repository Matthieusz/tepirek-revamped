import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import type { SharedSquadGroupSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-group-sharing/squad-group-sharing-schema";
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

import { useAppForm } from "@/components/forms/app-form";
import { Form } from "@/components/forms/form";
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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OptionalLevelSchema,
  SquadFilterNameSchema,
  validateSquadFilterLevelOrder,
} from "@/features/squad-builder/squad-filter-form-schemas";
import {
  globalSquadGroupsAtom,
  ownedSquadGroupsAtom,
} from "@/features/squad-builder/squad-group-atoms";
import type {
  GlobalSquadGroupSummary,
  SquadGroupSummary,
} from "@/features/squad-builder/squad-group-atoms";
import { sharedSquadGroupsAtom } from "@/features/squad-builder/squad-group-sharing-atoms";
import { formatDateTime } from "@/lib/utils";

import { userInitials } from "../user-presenters";
import {
  formatCharacterCount,
  formatSquadCount,
} from "./squad-group-presenters";

type SharedSquadGroupSummary = SharedSquadGroupSummarySchema;
type SquadListTab = "mine" | "shared" | "public";

const isSquadListTab = (value: string): value is SquadListTab =>
  value === "mine" || value === "shared" || value === "public";

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
const PositiveLevelFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);
const decodeOptionalLevel = (value: string): number | null =>
  Option.getOrNull(Schema.decodeOption(PositiveLevelFromString)(value));

const SquadFilterFormSchema = Schema.Struct({
  maxLevel: OptionalLevelSchema,
  minLevel: OptionalLevelSchema,
  nameQuery: SquadFilterNameSchema,
}).check(
  Schema.makeFilter((values) => {
    const result = validateSquadFilterLevelOrder(values);
    return result === true ? undefined : result;
  })
);
const SquadFilterFormValidator = Schema.toStandardSchemaV1(
  SquadFilterFormSchema
);

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
  const form = useAppForm({
    defaultValues: emptyFilterForm,
    onSubmit: async ({ value }) => {
      const decoded =
        await SquadFilterFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }
      onApply({
        maxLevel: decoded.value.maxLevel.trim(),
        minLevel: decoded.value.minLevel.trim(),
        nameQuery: decoded.value.nameQuery.trim(),
      });
    },
    validators: { onSubmit: SquadFilterFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  return (
    <form.AppForm>
      <Form
        className="border-border grid gap-3 border-b px-4 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
        form={form}
      >
        <form.AppField name="nameQuery">
          {(field) => (
            <field.TextField
              label="Nazwa grupy"
              maxLength={80}
              placeholder="Szukaj po nazwie"
            />
          )}
        </form.AppField>
        <form.AppField name="minLevel">
          {(field) => (
            <field.TextField label="Poziom od" placeholder="Od" type="number" />
          )}
        </form.AppField>
        <form.AppField name="maxLevel">
          {(field) => (
            <field.TextField label="Poziom do" placeholder="Do" type="number" />
          )}
        </form.AppField>
        <div className="flex gap-2">
          <Button disabled={isSubmitting} type="submit">
            <Search className="size-3.5" />
            Filtruj
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() => {
              form.reset();
              onClear();
            }}
            type="button"
            variant="ghost"
          >
            Wyczyść
          </Button>
        </div>
      </Form>
    </form.AppForm>
  );
};

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
      <p className="text-muted-foreground max-w-md text-sm">{copy}</p>
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

type GroupRowProps =
  | { readonly group: SquadGroupSummary; readonly kind: "mine" }
  | { readonly group: SharedSquadGroupSummary; readonly kind: "shared" }
  | { readonly group: GlobalSquadGroupSummary; readonly kind: "public" };

const GroupRow = (props: GroupRowProps) => {
  const { group } = props;
  const owner = props.kind === "mine" ? undefined : props.group;
  let status = "publiczny";
  if (props.kind === "mine") {
    status = "właściciel";
  } else if (props.kind === "shared") {
    status = "edytor";
  }

  return (
    <li>
      <Link
        aria-label={`Otwórz grupę składów ${group.name}`}
        className="group hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-ring flex min-w-0 items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:gap-4"
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
            <span className="text-sm font-medium">{group.name}</span>
            <Badge
              size="sm"
              variant={props.kind === "public" ? "info-light" : "secondary"}
            >
              {status}
            </Badge>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
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
          className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  );
};

const assertNever = (value: never): never => {
  throw new Error(`Unhandled squad group list kind: ${String(value)}`);
};

type CollectionPanelProps =
  | {
      readonly filtered: boolean;
      readonly kind: "mine";
      readonly onCreateGroup: () => void;
      readonly onRetry: () => void;
      readonly result: AsyncResult.AsyncResult<
        readonly SquadGroupSummary[],
        unknown
      >;
    }
  | {
      readonly filtered: boolean;
      readonly kind: "shared";
      readonly onRetry: () => void;
      readonly result: AsyncResult.AsyncResult<
        readonly SharedSquadGroupSummary[],
        unknown
      >;
    }
  | {
      readonly filtered: boolean;
      readonly kind: "public";
      readonly onRetry: () => void;
      readonly result: AsyncResult.AsyncResult<
        readonly GlobalSquadGroupSummary[],
        unknown
      >;
    };

const CollectionPanel = (props: CollectionPanelProps) => {
  if (AsyncResult.isFailure(props.result)) {
    return <CollectionFailure onRetry={props.onRetry} />;
  }
  if (!AsyncResult.isSuccess(props.result)) {
    return <LoadingSpinner />;
  }
  if (props.result.value.length === 0) {
    return (
      <CollectionEmpty
        filtered={props.filtered}
        kind={props.kind}
        onCreateGroup={props.kind === "mine" ? props.onCreateGroup : undefined}
      />
    );
  }

  switch (props.kind) {
    case "mine": {
      return (
        <ul
          className="divide-border divide-y"
          aria-label={`Lista: ${props.kind}`}
        >
          {props.result.value.map((group) => (
            <GroupRow group={group} key={group.groupId} kind="mine" />
          ))}
        </ul>
      );
    }
    case "shared": {
      return (
        <ul
          className="divide-border divide-y"
          aria-label={`Lista: ${props.kind}`}
        >
          {props.result.value.map((group) => (
            <GroupRow group={group} key={group.groupId} kind="shared" />
          ))}
        </ul>
      );
    }
    case "public": {
      return (
        <ul
          className="divide-border divide-y"
          aria-label={`Lista: ${props.kind}`}
        >
          {props.result.value.map((group) => (
            <GroupRow group={group} key={group.groupId} kind="public" />
          ))}
        </ul>
      );
    }
    default: {
      return assertNever(props);
    }
  }
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
      onValueChange={(value) => {
        if (isSquadListTab(value)) {
          setActiveTab(value);
        }
      }}
      value={activeTab}
      className="flex-col"
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
              onClear={() => {
                setAppliedFilters(emptyFilterForm);
              }}
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
