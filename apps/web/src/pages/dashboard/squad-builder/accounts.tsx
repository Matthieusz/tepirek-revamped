import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";

import { ownedAccountsAtom } from "@/lib/squad-builder/account-import-atoms";
import { AccountAccessFrame } from "@/pages/dashboard/squad-builder/accounts/account-access-frame";
import { AccountImportFrame } from "@/pages/dashboard/squad-builder/accounts/account-import-frame";
import { OwnedAccountsGrid } from "@/pages/dashboard/squad-builder/accounts/owned-accounts-grid";
import { SectionFailure } from "@/pages/dashboard/squad-builder/accounts/section-failure";

export default function SquadBuilderAccountsPage() {
  const ownedAccountsResult = useAtomValue(ownedAccountsAtom);
  const refreshOwnedAccounts = useAtomRefresh(ownedAccountsAtom);
  const ownedAccounts = AsyncResult.isSuccess(ownedAccountsResult)
    ? ownedAccountsResult.value
    : [];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
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
          {AsyncResult.isFailure(ownedAccountsResult) ? (
            <SectionFailure
              message="Nie udało się wczytać zapisanych kont."
              onRetry={refreshOwnedAccounts}
            />
          ) : (
            <OwnedAccountsGrid
              accounts={ownedAccounts}
              isLoading={!AsyncResult.isSuccess(ownedAccountsResult)}
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
}
