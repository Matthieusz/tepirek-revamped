import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Plus, Swords, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

interface SquadGroupSummary {
  readonly groupId: number;
  readonly name: string;
  readonly squadCount: number;
  readonly characterCount: number;
  readonly updatedAt: string;
}

interface SharedSquadGroupSummary extends SquadGroupSummary {
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
}

interface SquadGroupInvitationSummary {
  readonly invitationId: number;
  readonly squadGroupId: number;
  readonly squadGroupName: string;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

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

const hasActiveFilters = (filters: SquadGroupListFilterFormState): boolean =>
  filters.nameQuery.trim().length > 0 ||
  filters.minLevel.trim().length > 0 ||
  filters.maxLevel.trim().length > 0;

const toListFiltersInput = (filters: SquadGroupListFilterFormState) => {
  const nameQuery = filters.nameQuery.trim();
  const minLevel = filters.minLevel.trim();
  const maxLevel = filters.maxLevel.trim();

  return {
    filters: {
      ...(maxLevel.length === 0 ? {} : { maxLevel: Number(maxLevel) }),
      ...(minLevel.length === 0 ? {} : { minLevel: Number(minLevel) }),
      ...(nameQuery.length === 0 ? {} : { nameQuery }),
    },
  };
};

const userInitials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

interface SquadGroupListFiltersProps {
  readonly filters: SquadGroupListFilterFormState;
  readonly error: string | null;
  readonly onApply: (event: React.FormEvent) => void;
  readonly onChange: (filters: SquadGroupListFilterFormState) => void;
  readonly onClear: () => void;
}

const SquadGroupListFilters = ({
  error,
  filters,
  onApply,
  onChange,
  onClear,
}: SquadGroupListFiltersProps) => (
  <form
    className="grid gap-3 rounded-lg border border-border bg-card/60 p-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_auto] sm:items-end"
    onSubmit={onApply}
  >
    <div className="space-y-2">
      <Label className="text-xs" htmlFor="squad-list-name-query">
        Nazwa składu
      </Label>
      <Input
        id="squad-list-name-query"
        maxLength={80}
        onChange={(event) => {
          onChange({ ...filters, nameQuery: event.target.value });
        }}
        placeholder="Szukaj po nazwie…"
        value={filters.nameQuery}
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs" htmlFor="squad-list-min-level">
        Poziom od
      </Label>
      <Input
        id="squad-list-min-level"
        min={1}
        onChange={(event) => {
          onChange({ ...filters, minLevel: event.target.value });
        }}
        type="number"
        value={filters.minLevel}
      />
    </div>
    <div className="space-y-2">
      <Label className="text-xs" htmlFor="squad-list-max-level">
        Poziom do
      </Label>
      <Input
        id="squad-list-max-level"
        min={1}
        onChange={(event) => {
          onChange({ ...filters, maxLevel: event.target.value });
        }}
        type="number"
        value={filters.maxLevel}
      />
    </div>
    <div className="flex gap-2">
      <Button type="submit">Filtruj</Button>
      <Button onClick={onClear} type="button" variant="ghost">
        Wyczyść
      </Button>
    </div>
    {error !== null && (
      <p className="text-destructive text-sm sm:col-span-4">{error}</p>
    )}
  </form>
);

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
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState<SquadListTab>("mine");
  const [draftFilters, setDraftFilters] = useState(emptyFilterForm);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilterForm);
  const [filterError, setFilterError] = useState<string | null>(null);
  const activeFilters = hasActiveFilters(appliedFilters);
  const listFiltersInput = toListFiltersInput(appliedFilters);

  const groupsQuery = useQuery(
    orpc.squadBuilder.listMySquadGroups.queryOptions()
  );
  const sharedGroupsQuery = useQuery(
    orpc.squadBuilder.listSharedSquadGroups.queryOptions({
      input: listFiltersInput,
    })
  );
  const globalGroupsQuery = useQuery(
    orpc.squadBuilder.listGlobalSquadGroups.queryOptions({
      input: listFiltersInput,
    })
  );
  const invitesQuery = useQuery(
    orpc.squadBuilder.listIncomingSquadGroupInvites.queryOptions()
  );

  const createMutation = useMutation(
    orpc.squadBuilder.createSquadGroup.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: async (group) => {
        toast.success("Grupa składów została utworzona");
        setName("");
        await queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listMySquadGroups.queryKey(),
        });
        await navigate({
          params: { groupId: String(group.groupId) },
          to: "/dashboard/squad-builder/squads/$groupId",
        });
      },
    })
  );

  const respondMutation = useMutation(
    orpc.squadBuilder.respondToSquadGroupInvite.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: async () => {
        toast.success("Zapisano odpowiedź na zaproszenie");
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              orpc.squadBuilder.listIncomingSquadGroupInvites.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.squadBuilder.listSharedSquadGroups.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey:
              orpc.squadBuilder.getPendingSquadGroupInviteCount.queryKey(),
          }),
        ]);
      },
    })
  );

  const groups = (groupsQuery.data?.groups ??
    []) as readonly SquadGroupSummary[];
  const sharedGroups = (sharedGroupsQuery.data?.groups ??
    []) as readonly SharedSquadGroupSummary[];
  const globalGroups = (globalGroupsQuery.data?.groups ??
    []) as readonly SharedSquadGroupSummary[];
  const invites = (invitesQuery.data?.invites ??
    []) as readonly SquadGroupInvitationSummary[];
  const trimmedName = name.trim();

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedNameQuery = draftFilters.nameQuery.trim();
    const minLevel = Number(draftFilters.minLevel);
    const maxLevel = Number(draftFilters.maxLevel);

    if (normalizedNameQuery.length === 1) {
      setFilterError("Wpisz co najmniej 2 znaki nazwy składu.");
      return;
    }

    if (
      draftFilters.minLevel.trim().length > 0 &&
      draftFilters.maxLevel.trim().length > 0 &&
      minLevel > maxLevel
    ) {
      setFilterError("Poziom od nie może być większy niż poziom do.");
      return;
    }

    setFilterError(null);
    setAppliedFilters({ ...draftFilters, nameQuery: normalizedNameQuery });
  };

  const clearFilters = () => {
    setFilterError(null);
    setDraftFilters(emptyFilterForm);
    setAppliedFilters(emptyFilterForm);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
            Składy
          </h1>
          <p className="text-muted-foreground text-sm">
            Twórz grupy składów z postaci dostępnych na Twoich kontach.
          </p>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmedName.length === 0) {
              toast.error("Podaj nazwę grupy");
              return;
            }
            void createMutation.mutate({ name: trimmedName });
          }}
        >
          <Input
            aria-label="Nazwa nowej grupy składów"
            className="w-64 max-w-full"
            disabled={createMutation.isPending}
            id="squad-group-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Np. Kolos tygodniowy"
            value={name}
          />
          <Button
            disabled={createMutation.isPending || trimmedName.length === 0}
            type="submit"
          >
            {createMutation.isPending ? (
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
        <section aria-label="Moje grupy składów" className="space-y-2">
          {groupsQuery.isLoading && <SquadGroupsSkeleton />}
          {!groupsQuery.isLoading && groups.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-12 text-center">
              <Swords
                aria-hidden="true"
                className="mx-auto size-8 text-muted-foreground"
              />
              <p className="mx-auto mt-3 max-w-md text-muted-foreground text-sm">
                Nie masz jeszcze grup składów. Utwórz pierwszą grupę i dodaj
                postacie z Jaruny.
              </p>
            </div>
          )}
          {groups.length > 0 && (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {groups.map((group) => (
                <MineGroupRow group={group} key={group.groupId} />
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
            error={filterError}
            filters={draftFilters}
            onApply={applyFilters}
            onChange={setDraftFilters}
            onClear={clearFilters}
          />
          {sharedGroupsQuery.isLoading && <SquadGroupsSkeleton />}
          {!sharedGroupsQuery.isLoading && sharedGroups.length === 0 && (
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
                  badge={<Badge variant="outline">edytor</Badge>}
                  group={group}
                  key={group.groupId}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === "public" && (
        <section aria-label="Publiczne grupy składów" className="space-y-3">
          <SquadGroupListFilters
            error={filterError}
            filters={draftFilters}
            onApply={applyFilters}
            onChange={setDraftFilters}
            onClear={clearFilters}
          />
          {globalGroupsQuery.isLoading && <SquadGroupsSkeleton />}
          {!globalGroupsQuery.isLoading && globalGroups.length === 0 && (
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
                  badge={<Badge variant="secondary">publiczny</Badge>}
                  group={group}
                  key={group.groupId}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
