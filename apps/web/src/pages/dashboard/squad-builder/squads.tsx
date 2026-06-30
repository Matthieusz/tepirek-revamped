import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Swords } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
    className="grid gap-3 rounded-xl border border-border bg-card/80 p-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end"
    onSubmit={onApply}
  >
    <div className="space-y-2">
      <Label htmlFor="squad-list-name-query">Nazwa składu</Label>
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
      <Label htmlFor="squad-list-min-level">Poziom od</Label>
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
      <Label htmlFor="squad-list-max-level">Poziom do</Label>
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
      <Button onClick={onClear} type="button" variant="outline">
        Wyczyść
      </Button>
    </div>
    {error !== null && (
      <p className="text-destructive text-sm sm:col-span-4">{error}</p>
    )}
  </form>
);

const SquadGroupsSkeleton = () => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: 3 }, (_, index) => (
      <Skeleton className="h-20 w-full" key={index} />
    ))}
  </div>
);

// oxlint-disable-next-line complexity
export default function SquadBuilderSquadsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
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
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Składy
        </h1>
        <p className="text-muted-foreground text-sm">
          Twórz grupy składów z postaci dostępnych na Twoich kontach.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmedName.length === 0) {
            toast.error("Podaj nazwę grupy");
            return;
          }
          void createMutation.mutate({ name: trimmedName });
        }}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="squad-group-name">Nowa grupa</Label>
          <Input
            disabled={createMutation.isPending}
            id="squad-group-name"
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            placeholder="Np. Kolos tygodniowy"
            value={name}
          />
        </div>
        <Button
          disabled={createMutation.isPending || trimmedName.length === 0}
          type="submit"
        >
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Nowa grupa
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold text-base">Moje grupy składów</h2>
        {groupsQuery.isLoading && <SquadGroupsSkeleton />}
        {!groupsQuery.isLoading && groups.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center">
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
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <li key={group.groupId}>
                <Link
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
                  params={{ groupId: String(group.groupId) }}
                  to="/dashboard/squad-builder/squads/$groupId"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-sm">{group.name}</span>
                    <Badge variant="secondary">
                      {group.squadCount} składów
                    </Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs">
                    {group.characterCount} postaci · aktualizacja{" "}
                    {formatDateTime(group.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-base">Filtry list</h2>
        <SquadGroupListFilters
          error={filterError}
          filters={draftFilters}
          onApply={applyFilters}
          onChange={setDraftFilters}
          onClear={clearFilters}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-base">Udostępnione mi</h2>
        {sharedGroupsQuery.isLoading && <SquadGroupsSkeleton />}
        {!sharedGroupsQuery.isLoading && sharedGroups.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground text-sm">
            {activeFilters
              ? "Brak udostępnionych składów pasujących do filtrów."
              : "Nie masz jeszcze udostępnionych grup składów."}
          </p>
        )}
        {sharedGroups.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sharedGroups.map((group) => (
              <li key={group.groupId}>
                <Link
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
                  params={{ groupId: String(group.groupId) }}
                  to="/dashboard/squad-builder/squads/$groupId"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-sm">{group.name}</span>
                    <Badge variant="outline">edytor</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs">
                    Właściciel: {group.ownerUserName} · {group.characterCount}{" "}
                    postaci
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-base">Publiczne</h2>
        {globalGroupsQuery.isLoading && <SquadGroupsSkeleton />}
        {!globalGroupsQuery.isLoading && globalGroups.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground text-sm">
            {activeFilters
              ? "Brak publicznych składów pasujących do filtrów."
              : "Nie ma jeszcze publicznych składów."}
          </p>
        )}
        {globalGroups.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {globalGroups.map((group) => (
              <li key={group.groupId}>
                <Link
                  aria-label={`Publiczna grupa składów ${group.name}, właściciel ${group.ownerUserName}`}
                  className="block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
                  params={{ groupId: String(group.groupId) }}
                  to="/dashboard/squad-builder/squads/$groupId"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-sm">{group.name}</span>
                    <Badge variant="secondary">publiczny</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground text-xs">
                    Właściciel: {group.ownerUserName} · {group.characterCount}{" "}
                    postaci · aktualizacja {formatDateTime(group.updatedAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-base">Zaproszenia</h2>
        {invitesQuery.isLoading && <SquadGroupsSkeleton />}
        {!invitesQuery.isLoading && invites.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-card p-6 text-muted-foreground text-sm">
            Nie masz nowych zaproszeń do składów.
          </p>
        )}
        {invites.length > 0 && (
          <ul className="space-y-3">
            {invites.map((invite) => (
              <li
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                key={invite.invitationId}
              >
                <div>
                  <p className="font-medium text-sm">
                    Zaproszenie do edycji składu: {invite.squadGroupName}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Od: {invite.ownerUserName} ·{" "}
                    {formatDateTime(invite.createdAt)}
                  </p>
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
                    type="button"
                  >
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
                    type="button"
                    variant="outline"
                  >
                    Odrzuć
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
