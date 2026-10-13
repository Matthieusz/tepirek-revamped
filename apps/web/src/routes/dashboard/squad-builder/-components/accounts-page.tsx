import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ownedAccountsQueryOptions } from "@/features/squad-builder/account-queries";
import { AccountAccessFrame } from "@/routes/dashboard/squad-builder/-components/accounts/account-access-frame";
import { AccountImportFrame } from "@/routes/dashboard/squad-builder/-components/accounts/account-import-frame";
import { BulkAccountRefetchWorkflow } from "@/routes/dashboard/squad-builder/-components/accounts/bulk-account-refetch-workflow";
import { OwnedAccountsGrid } from "@/routes/dashboard/squad-builder/-components/accounts/owned-accounts-grid";
import { SectionFailure } from "@/routes/dashboard/squad-builder/-components/accounts/section-failure";

const SquadBuilderAccountsPage = () => {
  const ownedAccountsQuery = useQuery(ownedAccountsQueryOptions());
  const ownedAccounts = ownedAccountsQuery.data ?? [];
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
              Konta Margonem
            </h1>
            <p className="text-muted-foreground text-sm">
              Zarządzaj kontami, udostępniaj je współgildiom i używaj postaci z
              Jaruny w składach.
            </p>
          </div>
          <DialogTrigger render={<Button className="shrink-0" />}>
            <Plus aria-hidden="true" className="size-4" />
            Dodaj konta
          </DialogTrigger>
        </div>
        <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Dodaj konta Margonem</DialogTitle>
            <DialogDescription>
              Wklej linki do profili, sprawdź postacie z Jaruny i zapisz wybrane
              konta.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain p-1">
            <AccountImportFrame />
          </div>
        </DialogContent>
      </Dialog>

      {ownedAccountsQuery.isError && ownedAccountsQuery.data === undefined ? (
        <SectionFailure
          message="Nie udało się wczytać zapisanych kont."
          onRetry={() => {
            void ownedAccountsQuery.refetch();
          }}
        />
      ) : (
        <OwnedAccountsGrid
          accounts={ownedAccounts}
          headerActions={
            <BulkAccountRefetchWorkflow accounts={ownedAccounts} />
          }
          isLoading={ownedAccountsQuery.isPending}
          onAddAccount={() => {
            setIsImportOpen(true);
          }}
        />
      )}
      <AccountAccessFrame />
    </div>
  );
};

export default SquadBuilderAccountsPage;
