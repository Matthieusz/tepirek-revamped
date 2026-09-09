import { useQuery } from "@tanstack/react-query";

import { ownedAccountsQueryOptions } from "@/features/squad-builder/account-queries";
import { AccountAccessFrame } from "@/routes/dashboard/squad-builder/-components/accounts/account-access-frame";
import { AccountImportFrame } from "@/routes/dashboard/squad-builder/-components/accounts/account-import-frame";
import { OwnedAccountsGrid } from "@/routes/dashboard/squad-builder/-components/accounts/owned-accounts-grid";
import { SectionFailure } from "@/routes/dashboard/squad-builder/-components/accounts/section-failure";

const SquadBuilderAccountsPage = () => {
  const ownedAccountsQuery = useQuery(ownedAccountsQueryOptions());
  const ownedAccounts = ownedAccountsQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="text-foreground font-serif text-2xl font-bold tracking-tight">
          Konta Margonem
        </h1>
        <p className="text-muted-foreground text-sm">
          Importuj własne konta, udostępniaj je współgildiom i używaj postaci z
          Jaruny przy budowaniu składów.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-6">
          <AccountImportFrame />
          {ownedAccountsQuery.isError &&
          ownedAccountsQuery.data === undefined ? (
            <SectionFailure
              message="Nie udało się wczytać zapisanych kont."
              onRetry={() => {
                void ownedAccountsQuery.refetch();
              }}
            />
          ) : (
            <OwnedAccountsGrid
              accounts={ownedAccounts}
              isLoading={ownedAccountsQuery.isPending}
              onAddAccount={() => {
                requestAnimationFrame(() => {
                  const field = document.querySelector<HTMLTextAreaElement>(
                    'textarea[name="profileUrls"]'
                  );
                  const prefersReducedMotion = window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                  ).matches;
                  field?.scrollIntoView({
                    behavior: prefersReducedMotion ? "auto" : "smooth",
                    block: "center",
                  });
                  field?.focus({ preventScroll: true });
                });
              }}
            />
          )}
        </div>
        <AccountAccessFrame />
      </div>
    </div>
  );
};

export default SquadBuilderAccountsPage;
