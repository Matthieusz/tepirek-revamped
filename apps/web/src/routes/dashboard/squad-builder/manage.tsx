import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Share2, Users } from "lucide-react";
import { useState } from "react";
import { ErrorBoundary } from "@/components/error-boundary";
import { SquadCard } from "@/components/squad-builder/squad-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/squad-builder/manage")({
  component: RouteComponent,
  staticData: {
    crumb: "Zarządzaj drużynami",
  },
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: squads, isPending: squadsLoading } = useQuery(
    orpc.squad.getMySquads.queryOptions()
  );

  // Filter squads by search query (using debounced value)
  const filteredSquads = squads?.filter(
    (s) =>
      debouncedSearchQuery === "" ||
      s.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      s.world.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      s.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const ownedSquads = filteredSquads?.filter((s) => s.isOwner) ?? [];
  const sharedSquads = filteredSquads?.filter((s) => !s.isOwner) ?? [];

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-2xl sm:text-3xl">Twoje drużyny</h1>
            <p className="text-muted-foreground text-sm">
              Przeglądaj i zarządzaj swoimi squadami
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/squad-builder/create">
              <Plus className="mr-2 h-4 w-4" />
              Nowy squad
            </Link>
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwie, świecie lub opisie..."
            value={searchQuery}
          />
        </div>

        {squadsLoading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        )}
        {!squadsLoading &&
          ownedSquads.length === 0 &&
          sharedSquads.length === 0 &&
          !searchQuery && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 font-semibold text-lg">Brak squadów</h3>
                <p className="mb-4 text-center text-muted-foreground">
                  Nie masz jeszcze żadnych squadów. Utwórz pierwszy!
                </p>
                <Button asChild>
                  <Link to="/dashboard/squad-builder/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Utwórz squad
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        {!squadsLoading &&
          ownedSquads.length === 0 &&
          sharedSquads.length === 0 &&
          searchQuery && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Search className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="mb-2 font-semibold text-lg">Brak wyników</h3>
                <p className="mb-4 text-center text-muted-foreground">
                  Nie znaleziono squadów pasujących do "{searchQuery}"
                </p>
                <Button onClick={() => setSearchQuery("")} variant="outline">
                  Wyczyść wyszukiwanie
                </Button>
              </CardContent>
            </Card>
          )}
        {!squadsLoading &&
          (ownedSquads.length > 0 || sharedSquads.length > 0) && (
            <div className="space-y-8">
              {/* Własne squady */}
              {ownedSquads.length > 0 && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
                    <Users className="h-5 w-5" />
                    Twoje squady ({ownedSquads.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {ownedSquads.map((squad) => (
                      <SquadCard key={squad.id} squad={squad} />
                    ))}
                  </div>
                </section>
              )}

              {/* Udostępnione squady */}
              {sharedSquads.length > 0 && (
                <section>
                  <h2 className="mb-4 flex items-center gap-2 font-semibold text-xl">
                    <Share2 className="h-5 w-5" />
                    Udostępnione Ci ({sharedSquads.length})
                  </h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {sharedSquads.map((squad) => (
                      <SquadCard key={squad.id} squad={squad} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
      </div>
    </ErrorBoundary>
  );
}
