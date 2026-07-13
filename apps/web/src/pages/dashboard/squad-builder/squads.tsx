import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { SharedSquadGroupSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/squad-group-sharing/squad-group-sharing-schema";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Check, Loader2, Plus, Swords, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import { EffectTextField } from "@/components/forms/effect-form-fields";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/errors";
import {
  OptionalLevelSchema,
  SquadFilterNameSchema,
  validateSquadFilterLevelOrder,
} from "@/lib/form-schemas";
import {
  createSquadGroupAtom,
  globalSquadGroupsAtom,
  ownedSquadGroupsAtom,
} from "@/lib/squad-builder/squad-group-atoms";
import type { SquadGroupSummary } from "@/lib/squad-builder/squad-group-atoms";
import {
  incomingSquadGroupInvitesAtom,
  respondToSquadGroupInviteAtom,
  sharedSquadGroupsAtom,
} from "@/lib/squad-builder/squad-group-sharing-atoms";
import { sessionAtom } from "@/lib/user-atoms";
import { formatDateTime } from "@/lib/utils";

type SharedSquadGroupSummary = typeof SharedSquadGroupSummarySchema.Type;
interface SquadGroupListFilterFormState {
  readonly nameQuery: string;
  readonly minLevel: string;
  readonly maxLevel: string;
}

type SquadListTab = "mine" | "shared" | "public";

const emptyFilterForm: SquadGroupListFilterFormState = {
  maxLevel: "",
  minLevel: "",
  nameQuery: "",
};

const squadFilterFormBuilder = FormBuilder.empty
  .addField("nameQuery", SquadFilterNameSchema)
  .addField("minLevel", OptionalLevelSchema)
  .addField("maxLevel", OptionalLevelSchema)
  .refine(validateSquadFilterLevelOrder);

type ApplySquadGroupFilters = (filters: SquadGroupListFilterFormState) => void;

const squadFilterForm = FormReact.make(squadFilterFormBuilder, {
  fields: {
    maxLevel: EffectTextField,
    minLevel: EffectTextField,
    nameQuery: EffectTextField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (
    { onApply }: { readonly onApply: ApplySquadGroupFilters },
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
  filters.nameQuery.trim().length > 0 ||
  filters.minLevel.trim().length > 0 ||
  filters.maxLevel.trim().length > 0;

const userInitials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

interface SquadGroupListFiltersProps {
  readonly onApply: ApplySquadGroupFilters;
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
      {/* Filters are disposable input and intentionally do not block navigation. */}
      <EffectForm
        action={() => submit({ onApply })}
        className="grid gap-3 rounded-lg border border-border bg-card/60 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
        submitResult={submitResult}
      >
        <squadFilterForm.nameQuery
          className="space-y-2"
          label="Nazwa składu"
          maxLength={80}
          placeholder="Szukaj po nazwie…"
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
      </EffectForm>
    </squadFilterForm.Initialize>
  );
};

const SquadGroupsSkeleton = () => (
  <ul className="divide-y divide-border" aria-hidden="true">
    {Array.from({ length: 4 }, (_, index) => (
      <li className="flex items-center justify-between gap-4 py-3" key={index}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-5 w-16" />
      </li>
    ))}
  </ul>
);

interface MineGroupRowProps {
  readonly group: SquadGroupSummary;
}

const MineGroupRow = ({ group }: MineGroupRowProps) => (
  <li>
    <Link
      className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
      params={{ groupId: String(group.groupId) }}
      to="/dashboard/squad-builder/squads/$groupId"
    >
      <div className="min-w-0 space-y-1">
        <span className="block truncate font-medium text-sm">{group.name}</span>
        <p className="font-mono text-xs text-muted-foreground">
          {group.characterCount} postaci · aktualizacja{" "}
          {formatDateTime(group.updatedAt)}
        </p>
      </div>
      <Badge variant="secondary">{group.squadCount} składów</Badge>
    </Link>
  </li>
);

interface SharedGroupRowProps {
  readonly group: SharedSquadGroupSummary;
  readonly badge: React.ReactNode;
}

const SharedGroupRow = ({ badge, group }: SharedGroupRowProps) => (
  <li>
    <Link
      className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-muted/50"
      params={{ groupId: String(group.groupId) }}
      to="/dashboard/squad-builder/squads/$groupId"
    >
      <div className="min-w-0 space-y-1.5">
        <span className="block truncate font-medium text-sm">{group.name}</span>
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            {group.ownerUserImage ? (
              <AvatarImage
                alt={group.ownerUserName}
                src={group.ownerUserImage}
              />
            ) : null}
            <AvatarFallback>{userInitials(group.ownerUserName)}</AvatarFallback>
          </Avatar>
          <p className="font-mono text-xs text-muted-foreground">
            {group.ownerUserName} · {group.characterCount} postaci
          </p>
        </div>
      </div>
      {badge}
    </Link>
  </li>
);

interface SquadListTabsProps {
  readonly activeTab: SquadListTab;
  readonly mineCount: number;
  readonly sharedCount: number;
  readonly publicCount: number;
  readonly onChange: (tab: SquadListTab) => void;
}

const SquadListTabs = ({
  activeTab,
  mineCount,
  onChange,
  publicCount,
  sharedCount,
}: SquadListTabsProps) => {
  const tabs: readonly {
    readonly id: SquadListTab;
    readonly label: string;
    readonly count: number;
  }[] = [
    { count: mineCount, id: "mine", label: "Moje" },
    { count: sharedCount, id: "shared", label: "Udostępnione" },
    { count: publicCount, id: "public", label: "Publiczne" },
  ];

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg bg-muted/40 p-1"
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            aria-selected={isActive}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
            <span
              className={`font-mono text-xs tabular-nums ${
                isActive ? "text-muted-foreground" : "text-muted-foreground/70"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// oxlint-disable-next-line complexity
export default function SquadBuilderSquadsPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<SquadListTab>("mine");
  const [appliedFilters, setAppliedFilters] = useState(emptyFilterForm);
  useEffectFormProtection(name.trim().length > 0, isCreating);
  const activeFilters = hasActiveFilters(appliedFilters);
  useAtomValue(sessionAtom);
  const sharedGroupsResult = useAtomValue(sharedSquadGroupsAtom);
  const groupsResult = useAtomValue(ownedSquadGroupsAtom);
  const globalGroupsAtomValue = globalSquadGroupsAtom({
    maxLevel:
      appliedFilters.maxLevel.trim().length === 0
        ? null
        : Number(appliedFilters.maxLevel),
    minLevel:
      appliedFilters.minLevel.trim().length === 0
        ? null
        : Number(appliedFilters.minLevel),
    nameQuery:
      appliedFilters.nameQuery.trim().length === 0
        ? null
        : appliedFilters.nameQuery,
  });
  const globalGroupsResult = useAtomValue(globalGroupsAtomValue);
  const invitesResult = useAtomValue(incomingSquadGroupInvitesAtom);
  const refreshGroups = useAtomRefresh(ownedSquadGroupsAtom);
  const refreshSharedGroups = useAtomRefresh(sharedSquadGroupsAtom);
  const refreshGlobalGroups = useAtomRefresh(globalGroupsAtomValue);
  const refreshInvites = useAtomRefresh(incomingSquadGroupInvitesAtom);
  const createSquadGroup = useAtomSet(createSquadGroupAtom, {
    mode: "promise",
  });
  const respondToInvite = useAtomSet(respondToSquadGroupInviteAtom, {
    mode: "promise",
  });

  const respondMutation = {
    isPending: false,
    mutate: (input: {
      readonly invitationId: number;
      readonly response: "accept" | "decline";
    }) => {
      const respond = async () => {
        try {
          await respondToInvite(input);
          toast.success("Zapisano odpowiedź na zaproszenie");
        } catch (error: unknown) {
          toast.error(
            getErrorMessage(error, "Nie udało się zapisać odpowiedzi")
          );
        }
      };

      void respond();
    },
  };

  const groups = AsyncResult.isSuccess(groupsResult) ? groupsResult.value : [];
  const sharedGroups = AsyncResult.isSuccess(sharedGroupsResult)
    ? sharedGroupsResult.value
    : [];
  const globalGroups = AsyncResult.isSuccess(globalGroupsResult)
    ? globalGroupsResult.value
    : [];
  const invites = AsyncResult.isSuccess(invitesResult)
    ? invitesResult.value
    : [];
  const groupsQuery = { isLoading: !AsyncResult.isSuccess(groupsResult) };
  const sharedGroupsQuery = {
    isLoading: !AsyncResult.isSuccess(sharedGroupsResult),
  };
  const globalGroupsQuery = {
    isLoading: !AsyncResult.isSuccess(globalGroupsResult),
  };

  const applyFilters: ApplySquadGroupFilters = (filters) => {
    setAppliedFilters(filters);
  };

  const clearFilters = () => {
    setAppliedFilters(emptyFilterForm);
  };

  const submitSquadGroup = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      toast.error("Podaj nazwę grupy");
      return;
    }

    setIsCreating(true);
    try {
      const group = await createSquadGroup({ name: trimmedName });
      toast.success("Grupa składów została utworzona");
      setName("");
      await navigate({
        params: { groupId: String(group.groupId) },
        to: "/dashboard/squad-builder/squads/$groupId",
      });
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Nie udało się utworzyć grupy składów")
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AsyncResultBoundary onRetry={refreshGroups} result={groupsResult}>
      {() => (
        <AsyncResultBoundary
          onRetry={refreshSharedGroups}
          result={sharedGroupsResult}
        >
          {() => (
            <AsyncResultBoundary
              onRetry={refreshGlobalGroups}
              result={globalGroupsResult}
            >
              {() => (
                <AsyncResultBoundary
                  onRetry={refreshInvites}
                  result={invitesResult}
                >
                  {() => (
                    <div className="mx-auto w-full max-w-6xl space-y-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
                            Składy
                          </h1>
                          <p className="text-muted-foreground text-sm">
                            Twórz grupy składów z postaci dostępnych na Twoich
                            kontach.
                          </p>
                        </div>
                        <form
                          action={submitSquadGroup}
                          className="flex items-end gap-2"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="squad-group-name">
                              Nazwa nowej grupy składów
                            </Label>
                            <Input
                              className="w-64 max-w-full"
                              disabled={isCreating}
                              id="squad-group-name"
                              maxLength={80}
                              onChange={(event) => setName(event.target.value)}
                              placeholder="Np. Kolos tygodniowy"
                              value={name}
                            />
                          </div>
                          <Button disabled={isCreating} type="submit">
                            {isCreating ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Plus className="size-4" />
                            )}
                            <span className="hidden sm:inline">Nowa grupa</span>
                            <span className="sm:hidden">Dodaj</span>
                          </Button>
                        </form>
                      </div>

                      {invites.length > 0 && (
                        <section
                          aria-label="Zaproszenia do składów"
                          className="rounded-xl border border-border bg-card px-4 py-3"
                        >
                          <ul className="space-y-2">
                            {invites.map((invite) => (
                              <li
                                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                                key={invite.invitationId}
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <Avatar size="sm">
                                    {invite.ownerUserImage ? (
                                      <AvatarImage
                                        alt={invite.ownerUserName}
                                        src={invite.ownerUserImage}
                                      />
                                    ) : null}
                                    <AvatarFallback>
                                      {userInitials(invite.ownerUserName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 space-y-0.5">
                                    <p className="truncate font-medium text-sm">
                                      {invite.squadGroupName}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                      Zaproszenie od {invite.ownerUserName} ·{" "}
                                      {formatDateTime(invite.createdAt)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    disabled={respondMutation.isPending}
                                    onClick={() =>
                                      respondMutation.mutate({
                                        invitationId: invite.invitationId,
                                        response: "accept",
                                      })
                                    }
                                    size="sm"
                                    type="button"
                                  >
                                    <Check className="size-3.5" />
                                    Przyjmij
                                  </Button>
                                  <Button
                                    disabled={respondMutation.isPending}
                                    onClick={() =>
                                      respondMutation.mutate({
                                        invitationId: invite.invitationId,
                                        response: "decline",
                                      })
                                    }
                                    size="sm"
                                    type="button"
                                    variant="ghost"
                                  >
                                    <X className="size-3.5" />
                                    Odrzuć
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}

                      <SquadListTabs
                        activeTab={activeTab}
                        mineCount={groups.length}
                        onChange={setActiveTab}
                        publicCount={globalGroups.length}
                        sharedCount={sharedGroups.length}
                      />

                      {activeTab === "mine" && (
                        <section
                          aria-label="Moje grupy składów"
                          className="space-y-2"
                        >
                          {groupsQuery.isLoading && <SquadGroupsSkeleton />}
                          {!groupsQuery.isLoading && groups.length === 0 && (
                            <div className="rounded-xl border border-dashed border-border py-12 text-center">
                              <Swords
                                aria-hidden="true"
                                className="mx-auto size-8 text-muted-foreground"
                              />
                              <p className="mx-auto mt-3 max-w-md text-muted-foreground text-sm">
                                Nie masz jeszcze grup składów. Utwórz pierwszą
                                grupę i dodaj postacie z Jaruny.
                              </p>
                            </div>
                          )}
                          {groups.length > 0 && (
                            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                              {groups.map((group) => (
                                <MineGroupRow
                                  group={group}
                                  key={group.groupId}
                                />
                              ))}
                            </ul>
                          )}
                        </section>
                      )}

                      {activeTab === "shared" && (
                        <section
                          aria-label="Udostępnione mi grupy składów"
                          className="space-y-3"
                        >
                          <SquadGroupListFilters
                            onApply={applyFilters}
                            onClear={clearFilters}
                          />
                          {sharedGroupsQuery.isLoading && (
                            <SquadGroupsSkeleton />
                          )}
                          {!sharedGroupsQuery.isLoading &&
                            sharedGroups.length === 0 && (
                              <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground text-sm">
                                {activeFilters
                                  ? "Brak udostępnionych składów pasujących do filtrów."
                                  : "Nie masz jeszcze udostępnionych grup składów."}
                              </p>
                            )}
                          {sharedGroups.length > 0 && (
                            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                              {sharedGroups.map((group) => (
                                <SharedGroupRow
                                  badge={
                                    <Badge variant="outline">edytor</Badge>
                                  }
                                  group={group}
                                  key={group.groupId}
                                />
                              ))}
                            </ul>
                          )}
                        </section>
                      )}

                      {activeTab === "public" && (
                        <section
                          aria-label="Publiczne grupy składów"
                          className="space-y-3"
                        >
                          <SquadGroupListFilters
                            onApply={applyFilters}
                            onClear={clearFilters}
                          />
                          {globalGroupsQuery.isLoading && (
                            <SquadGroupsSkeleton />
                          )}
                          {!globalGroupsQuery.isLoading &&
                            globalGroups.length === 0 && (
                              <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground text-sm">
                                {activeFilters
                                  ? "Brak publicznych składów pasujących do filtrów."
                                  : "Nie ma jeszcze publicznych składów."}
                              </p>
                            )}
                          {globalGroups.length > 0 && (
                            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                              {globalGroups.map((group) => (
                                <SharedGroupRow
                                  badge={
                                    <Badge variant="secondary">publiczny</Badge>
                                  }
                                  group={group}
                                  key={group.groupId}
                                />
                              ))}
                            </ul>
                          )}
                        </section>
                      )}
                    </div>
                  )}
                </AsyncResultBoundary>
              )}
            </AsyncResultBoundary>
          )}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
}
