import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, User, Users } from "lucide-react";
import { useState } from "react";

import { ErrorBoundary } from "@/components/error-boundary";
import { AddGameAccountModal } from "@/components/modals/add-game-account-modal";
import { AccountCharactersList } from "@/components/squad-builder/account-characters-list";
import { AccountsList } from "@/components/squad-builder/accounts-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounce } from "@/hooks/use-debounce";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/dashboard/squad-builder/accounts")({
  component: RouteComponent,
  staticData: {
    crumb: "Zarządzaj kontami",
  },
});

const RouteComponent = () => {
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );
  const [accountSearchQuery, setAccountSearchQuery] = useState("");
  const [characterSearchQuery, setCharacterSearchQuery] = useState("");

  const debouncedAccountSearch = useDebounce(accountSearchQuery, 300);
  const debouncedCharacterSearch = useDebounce(characterSearchQuery, 300);

  const { data: gameAccounts, isPending: accountsLoading } = useQuery(
    orpc.squad.getMyGameAccounts.queryOptions()
  );

  const { data: allCharacters, isPending: charactersLoading } = useQuery(
    orpc.squad.getMyCharacters.queryOptions()
  );

  const selectedAccount = gameAccounts?.find((a) => a.id === selectedAccountId);
  const accountCharacters = allCharacters?.filter(
    (c) => c.gameAccountId === selectedAccountId
  );

  return (
    <ErrorBoundary>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-bold text-2xl sm:text-3xl">
              Zarządzaj kontami
            </h1>
            <p className="text-muted-foreground text-sm">
              Wybierz konto, aby zobaczyć i zarządzać postaciami
            </p>
          </div>
          <AddGameAccountModal
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj konto
              </Button>
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:h-[calc(100vh-220px)] lg:grid-cols-3">
          {/* Lista kont - lewa strona */}
          <Card className="flex flex-col lg:col-span-1">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Konta ({gameAccounts?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <AccountsList
                accounts={gameAccounts}
                debouncedSearchQuery={debouncedAccountSearch}
                isLoading={accountsLoading}
                onSelect={setSelectedAccountId}
                searchQuery={accountSearchQuery}
                selectedId={selectedAccountId}
                setSearchQuery={setAccountSearchQuery}
              />
            </CardContent>
          </Card>

          {/* Lista postaci - prawa strona */}
          <Card className="flex flex-col lg:col-span-2">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                {selectedAccount
                  ? `Postacie konta "${selectedAccount.name}" (${accountCharacters?.length ?? 0})`
                  : "Wybierz konto"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {selectedAccountId ? (
                <AccountCharactersList
                  canManage={Boolean(selectedAccount?.isOwner)}
                  characters={accountCharacters}
                  debouncedSearchQuery={debouncedCharacterSearch}
                  isLoading={charactersLoading}
                  searchQuery={characterSearchQuery}
                  setSearchQuery={setCharacterSearchQuery}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                  <p>
                    Wybierz konto z listy{" "}
                    <span className="hidden lg:inline">po lewej stronie</span>
                    <span className="lg:hidden">powyżej</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  );
};
