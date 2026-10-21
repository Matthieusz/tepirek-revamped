import type { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import { ExternalLink, Link2, Users } from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MargonemCharacterAvatarImage } from "@/features/squad-builder/shared/margonem-character-avatar-image";
import { getProfessionPresentation } from "@/features/squad-builder/shared/profession-presenters";
import { formatDateTime } from "@/lib/utils";
import { AccountCharactersDialog } from "@/routes/dashboard/squad-builder/-components/accounts/account-characters-dialog";
import { OwnedAccountManagementRow } from "@/routes/dashboard/squad-builder/-components/accounts/owned-account-management-row";

type OwnedAccount = OwnedMargonemAccountSummarySchema;

const OwnedAccountCharacterPreview = ({
  account,
}: {
  readonly account: OwnedAccount;
}) => {
  const [character] = account.characterPreviews;

  if (character === undefined) {
    return null;
  }

  const profession = getProfessionPresentation(character.profession);

  return (
    <div className="flex shrink-0 items-center">
      <span className="sr-only">Postać konta: {character.name}</span>
      <Avatar className="h-10 w-8 overflow-hidden rounded-none after:hidden">
        {character.avatarUrl !== null && character.avatarUrl.length > 0 ? (
          <MargonemCharacterAvatarImage alt="" src={character.avatarUrl} />
        ) : null}
        <AvatarFallback className="rounded-none">
          <profession.icon
            aria-hidden="true"
            className={`size-3.5 ${profession.colorClass}`}
          />
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

interface OwnedAccountsPanelProps {
  readonly accounts: readonly OwnedAccount[];
  readonly isLoading: boolean;
  readonly onAddAccount: () => void;
  readonly headerActions?: ReactNode;
}

/** Displays owned accounts with modal management controls that keep rows stationary. */
export const OwnedAccountsGrid = ({
  accounts,
  isLoading,
  onAddAccount,
  headerActions,
}: OwnedAccountsPanelProps) => (
  <Card className="gap-0 py-0">
    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
      <CardTitle className="flex items-center gap-2">
        <Users aria-hidden="true" className="text-muted-foreground size-4" />
        Twoje konta
        <Badge variant="secondary">{accounts.length}</Badge>
      </CardTitle>
      {headerActions}
    </CardHeader>
    {isLoading ? (
      <LoadingSpinner />
    ) : (
      <Table aria-label="Twoje konta Margonem">
        <TableHeader>
          <TableRow>
            <TableHead className="pl-5" scope="col">
              Konto
            </TableHead>
            <TableHead scope="col">Postacie</TableHead>
            <TableHead scope="col">Ostatnio pobrano</TableHead>
            <TableHead scope="col">Profil</TableHead>
            <TableHead scope="col">
              <span className="sr-only">Zarządzanie</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="whitespace-normal">
                <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center">
                  <Users aria-hidden="true" className="size-6" />
                  <p>
                    Nie masz jeszcze zapisanych kont. Dodaj profil Margonem.
                  </p>
                  <Button
                    onClick={onAddAccount}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Link2 aria-hidden="true" className="size-3.5" />
                    Dodaj konto
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {accounts.map((account) => (
            <TableRow key={account.accountId}>
              <TableCell className="pl-5">
                <div className="flex min-w-52 items-center gap-3">
                  <OwnedAccountCharacterPreview account={account} />
                  <div>
                    <p className="font-medium">{account.displayName}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      #{account.profileId}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <AccountCharactersDialog account={account} />
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {formatDateTime(account.lastFetchedAt)}
              </TableCell>
              <TableCell>
                <a
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                  href={account.generatedProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                  Margonem
                </a>
              </TableCell>
              <TableCell className="pr-5 text-right">
                <OwnedAccountManagementRow account={account} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </Card>
);
