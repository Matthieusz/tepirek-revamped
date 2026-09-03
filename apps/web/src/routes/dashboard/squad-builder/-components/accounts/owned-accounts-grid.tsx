import {
  ExternalLinkIcon,
  Link02Icon,
  UsersIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTable } from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import type { OwnedMargonemAccountSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import { useMemo } from "react";

import { Badge as ReuiBadge } from "@/components/reui/badge";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/reui/data-grid/data-grid";
import { dataGridFeatures } from "@/components/reui/data-grid/data-grid-features";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid-features";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame";
import { IconStack } from "@/components/reui/icon-stack";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { OwnedAccountManagementRow } from "@/routes/dashboard/squad-builder/-components/accounts/owned-account-management-row";
import { MargonemCharacterAvatarImage } from "@/routes/dashboard/squad-builder/-components/margonem-character-avatar-image";
import { getProfessionPresentation } from "@/routes/dashboard/squad-builder/-components/profession-presenters";

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
          <HugeiconsIcon
            aria-hidden="true"
            className={`size-3.5 ${profession.colorClass}`}
            icon={profession.icon}
          />
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

const OWNED_ACCOUNT_COLUMNS: ColumnDef<DataGridFeatures, OwnedAccount>[] = [
  {
    accessorKey: "displayName",
    cell: ({ row }) => (
      <div className="flex min-w-52 items-center gap-3">
        <OwnedAccountCharacterPreview account={row.original} />
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.displayName}</p>
          <p className="text-muted-foreground font-mono text-xs">
            #{row.original.profileId}
          </p>
        </div>
      </div>
    ),
    header: "Konto",
    meta: {
      expandedContent: (account) => (
        <OwnedAccountManagementRow account={account} />
      ),
    },
  },
  {
    accessorKey: "characterCount",
    cell: ({ row }) => (
      <ReuiBadge variant="secondary">{row.original.characterCount}</ReuiBadge>
    ),
    header: "Postacie",
  },
  {
    accessorKey: "lastFetchedAt",
    cell: ({ row }) => (
      <span className="font-mono text-xs whitespace-nowrap">
        {formatDateTime(row.original.lastFetchedAt)}
      </span>
    ),
    header: "Ostatnio pobrano",
  },
  {
    cell: ({ row }) => (
      <a
        className="text-primary inline-flex items-center gap-1 whitespace-nowrap hover:underline"
        href={row.original.generatedProfileUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <HugeiconsIcon
          aria-hidden="true"
          icon={ExternalLinkIcon}
          className="size-3.5"
        />
        Margonem
      </a>
    ),
    header: "Profil",
    id: "profile",
  },
  {
    cell: ({ row }) => (
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label={`${row.getIsExpanded() ? "Ukryj" : "Pokaż"} szczegóły konta ${row.original.displayName}`}
        onClick={() => {
          row.toggleExpanded();
        }}
      >
        {row.getIsExpanded() ? "Ukryj" : "Zarządzaj"}
      </Button>
    ),
    header: "",
    id: "expand",
  },
];

interface OwnedAccountsPanelProps {
  readonly accounts: readonly OwnedAccount[];
  readonly isLoading: boolean;
  readonly onAddAccount: () => void;
}

/** Displays owned accounts and expands each account's management controls. */
export const OwnedAccountsGrid = ({
  accounts,
  isLoading,
  onAddAccount,
}: OwnedAccountsPanelProps) => {
  const columns = OWNED_ACCOUNT_COLUMNS;
  const tableData = useMemo(() => [...accounts], [accounts]);
  const table = useTable({
    columns,
    data: tableData,
    features: dataGridFeatures,
    // Management controls are custom expanded content, not nested sub-rows.
    getRowCanExpand: () => true,
    getRowId: (account) => String(account.accountId),
  });

  return (
    <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
      <FramePanel className="p-0 shadow-none">
        <FrameHeader className="border-border flex-row items-center justify-between border-b px-5 py-3">
          <FrameTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon
              aria-hidden="true"
              className="text-muted-foreground size-4"
              icon={UsersIcon}
            />
            Twoje konta
          </FrameTitle>
          <span className="text-muted-foreground font-mono text-xs">
            {accounts.length}
          </span>
        </FrameHeader>
        <DataGrid
          table={table}
          recordCount={accounts.length}
          isLoading={isLoading}
          loadingMode="spinner"
          emptyMessage={
            <div className="flex flex-col items-center gap-2 py-6">
              <IconStack aria-hidden="true">
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={UsersIcon}
                  className="size-5"
                />
              </IconStack>
              <p>Nie masz jeszcze zapisanych kont. Dodaj profil powyżej.</p>
              <Button
                onClick={onAddAccount}
                size="sm"
                type="button"
                variant="outline"
              >
                <HugeiconsIcon
                  aria-hidden="true"
                  icon={Link02Icon}
                  className="size-3.5"
                />
                Dodaj konto
              </Button>
            </div>
          }
          tableLayout={{
            cellBorder: false,
            rowBorder: true,
            stripped: false,
            width: "auto",
          }}
        >
          <DataGridContainer className="overflow-x-auto">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      </FramePanel>
    </Frame>
  );
};
