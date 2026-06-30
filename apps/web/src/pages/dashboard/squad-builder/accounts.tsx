import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Inbox,
  Link2,
  Loader2,
  RotateCw,
  Search,
  Share2,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible } from "@/components/ui/collapsible";
import { CollapsibleContent } from "@/components/ui/collapsible-content";
import { CollapsibleTrigger } from "@/components/ui/collapsible-trigger";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

const PROFESSION_LABELS: Record<string, string> = {
  bladeDancer: "Tancerz ostrzy",
  hunter: "Łowca",
  mage: "Mag",
  paladin: "Paladyn",
  tracker: "Tropiciel",
  warrior: "Wojownik",
};

const MAX_PROFILE_URLS = 20;

type PreviewItem =
  | {
      readonly status: "success";
      readonly lineNumber: number;
      readonly inputUrl: string;
      readonly pendingImportId: number;
      readonly profileId: number;
      readonly generatedProfileUrl: string;
      readonly suggestedAccountName: string;
      readonly defaultDisplayName: string;
      readonly lastFetchedAt: string;
      readonly firecrawlCreditsUsed: number;
      readonly characterCount: number;
      readonly jarunaCharacters: readonly {
        readonly characterId: number;
        readonly name: string;
        readonly level: number;
        readonly profession: string;
        readonly avatarUrl: string | null;
      }[];
    }
  | {
      readonly status: "error";
      readonly lineNumber: number;
      readonly inputUrl: string;
      readonly errorTag: string;
      readonly message: string;
    };

interface OwnedAccount {
  readonly accountId: number;
  readonly profileId: number;
  readonly displayName: string;
  readonly generatedProfileUrl: string;
  readonly lastFetchedAt: string;
  readonly characterCount: number;
}

interface AccountInviteTarget {
  readonly userId: string;
  readonly name: string;
  readonly image: string | null;
}

interface AccountAccessInvite {
  readonly accessId: number;
  readonly accountId: number;
  readonly accountDisplayName: string;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly generatedProfileUrl: string;
  readonly status: "pending" | "accepted" | "declined" | "revoked";
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface SharedAccount {
  readonly accountId: number;
  readonly profileId: number;
  readonly displayName: string;
  readonly generatedProfileUrl: string;
  readonly ownerUserName: string;
  readonly ownerUserImage: string | null;
  readonly lastFetchedAt: string;
  readonly characterCount: number;
}

interface AccountRefetchPreview {
  readonly refetchPreviewId: number;
  readonly diff: {
    readonly added: readonly {
      readonly characterId: number;
      readonly name: string;
      readonly level: number;
      readonly profession: string;
      readonly avatarUrl: string | null;
    }[];
    readonly removed: readonly {
      readonly databaseCharacterId: number;
      readonly characterId: number;
      readonly name: string;
      readonly level: number;
      readonly profession: string;
      readonly avatarUrl: string | null;
      readonly affectedSquadCount: number;
    }[];
    readonly changed: readonly {
      readonly databaseCharacterId: number;
      readonly characterId: number;
      readonly name: string;
      readonly changes: readonly {
        readonly field: "name" | "level" | "profession" | "avatarUrl";
        readonly before: string | number | null;
        readonly after: string | number | null;
      }[];
    }[];
    readonly unchangedCount: number;
  };
}

interface AccountAccessGrant {
  readonly accessId: number;
  readonly userId: string;
  readonly userName: string;
  readonly userImage: string | null;
  readonly status: "pending" | "accepted";
  readonly createdAt: string;
  readonly updatedAt: string;
}

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
};

const userInitials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const PreviewSkeleton = () => (
  <ul className="space-y-2" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <li
        className="space-y-2 rounded-lg border border-border bg-card p-3"
        key={index}
      >
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-full" />
      </li>
    ))}
  </ul>
);

interface PreviewRowProps {
  readonly confirmingId: number | null;
  readonly displayNames: Record<number, string>;
  readonly isConfirming: boolean;
  readonly item: PreviewItem;
  readonly onConfirm: (
    item: Extract<PreviewItem, { status: "success" }>
  ) => void;
  readonly onDisplayNameChange: (
    pendingImportId: number,
    value: string
  ) => void;
}

const PreviewRow = ({
  confirmingId,
  displayNames,
  isConfirming,
  item,
  onConfirm,
  onDisplayNameChange,
}: PreviewRowProps) => {
  if (item.status === "error") {
    return (
      <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Wiersz {item.lineNumber}</Badge>
            <span className="truncate font-mono text-xs text-muted-foreground">
              {item.inputUrl}
            </span>
          </div>
          <p className="text-sm text-foreground">{item.message}</p>
        </div>
      </li>
    );
  }

  const isConfirmingThis = confirmingId === item.pendingImportId;

  return (
    <li className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">
              {item.suggestedAccountName}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              #{item.profileId}
            </span>
            <Badge variant="secondary">
              {item.characterCount}{" "}
              {item.characterCount === 1 ? "postać" : "postaci"}
            </Badge>
          </div>
          {item.jarunaCharacters.length > 0 && (
            <p className="font-mono text-xs text-muted-foreground">
              {item.jarunaCharacters
                .map(
                  (character) =>
                    `${character.name} ${character.level} ${PROFESSION_LABELS[character.profession] ?? character.profession}`
                )
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      <form
        className="flex flex-wrap items-center gap-2 pl-7"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(item);
        }}
      >
        <Input
          aria-label={`Nazwa konta dla profilu ${item.profileId}`}
          className="h-8 flex-1 min-w-40"
          disabled={isConfirming}
          maxLength={80}
          onChange={(event) => {
            onDisplayNameChange(item.pendingImportId, event.target.value);
          }}
          placeholder="Nazwa konta"
          value={displayNames[item.pendingImportId] ?? item.defaultDisplayName}
        />
        <Button
          aria-label={`Zapisz konto ${item.suggestedAccountName}`}
          disabled={isConfirming}
          type="submit"
        >
          {isConfirmingThis ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Zapisz konto
        </Button>
      </form>
    </li>
  );
};

interface ImportPanelProps {
  readonly canSubmit: boolean;
  readonly confirmingId: number | null;
  readonly displayNames: Record<number, string>;
  readonly isConfirming: boolean;
  readonly isPreviewPending: boolean;
  readonly previewItems: readonly PreviewItem[];
  readonly profileLineCount: number;
  readonly onClear: () => void;
  readonly onConfirm: (
    item: Extract<PreviewItem, { status: "success" }>
  ) => void;
  readonly onDisplayNameChange: (
    pendingImportId: number,
    value: string
  ) => void;
  readonly onSubmitPreview: (event: React.FormEvent) => void;
  readonly onUrlsChange: (value: string) => void;
  readonly urlsText: string;
}

const ImportPanel = ({
  canSubmit,
  confirmingId,
  displayNames,
  isConfirming,
  isPreviewPending,
  previewItems,
  profileLineCount,
  onClear,
  onConfirm,
  onDisplayNameChange,
  onSubmitPreview,
  onUrlsChange,
  urlsText,
}: ImportPanelProps) => (
  <section className="space-y-4">
    <form
      className="space-y-4 rounded-xl border border-border bg-card p-5"
      onSubmit={onSubmitPreview}
    >
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Link2 className="size-4 text-muted-foreground" />
          Import kont
        </h2>
        <p className="text-muted-foreground text-sm">
          Wklej linki do profili Margonem, aby pobrać postacie z Jaruny.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-urls">Linki do profili</Label>
        <Textarea
          aria-describedby="profile-urls-helper"
          className="min-h-32 font-mono text-xs"
          disabled={isPreviewPending}
          id="profile-urls"
          onChange={(event) => {
            onUrlsChange(event.target.value);
          }}
          placeholder="https://www.margonem.pl/profile/view,7298897"
          value={urlsText}
        />
        <p className="text-muted-foreground text-xs" id="profile-urls-helper">
          Wklej maksymalnie {MAX_PROFILE_URLS} linków, po jednym w wierszu.
          {profileLineCount > MAX_PROFILE_URLS && (
            <span className="text-destructive">
              {" "}
              Wykryto {profileLineCount} linków, ogranicz listę do{" "}
              {MAX_PROFILE_URLS}.
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button disabled={!canSubmit} type="submit">
          {isPreviewPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Sprawdź konta
        </Button>
        {previewItems.length > 0 && (
          <Button
            disabled={isPreviewPending || isConfirming}
            onClick={onClear}
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
            Wyczyść
          </Button>
        )}
      </div>
    </form>

    {isPreviewPending && previewItems.length === 0 && <PreviewSkeleton />}

    {previewItems.length > 0 && (
      <ul className="space-y-2">
        {previewItems.map((item) => (
          <PreviewRow
            confirmingId={confirmingId}
            displayNames={displayNames}
            isConfirming={isConfirming}
            item={item}
            key={item.lineNumber}
            onConfirm={onConfirm}
            onDisplayNameChange={onDisplayNameChange}
          />
        ))}
      </ul>
    )}
  </section>
);

const OwnedAccountsSkeleton = () => (
  <ul className="divide-y divide-border" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <li className="space-y-2 py-3 first:pt-0 last:pb-0" key={index}>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-40" />
      </li>
    ))}
  </ul>
);

interface AccountSharingPanelProps {
  readonly accountId: number;
  readonly accountDisplayName: string;
}

const AccountSharingPanel = ({
  accountId,
  accountDisplayName,
}: AccountSharingPanelProps) => {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const grantsQuery = useQuery(
    orpc.squadBuilder.listAccountAccessGrants.queryOptions({
      input: { accountId },
    })
  );

  const searchQuery = useQuery(
    orpc.squadBuilder.searchAccountInviteTargets.queryOptions({
      enabled: debouncedQuery.trim().length >= 2,
      input: { accountId, query: debouncedQuery },
      placeholderData: keepPreviousData,
    })
  );

  const sendMutation = useMutation(
    orpc.squadBuilder.sendAccountAccessInvite.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (_response, variables) => {
        toast.success(`Zaproszenie wysłane do ${variables.invitedUserId}`);
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listAccountAccessGrants.queryKey({
            input: { accountId },
          }),
        });
        setQuery("");
      },
    })
  );

  const revokeMutation = useMutation(
    orpc.squadBuilder.revokeAccountAccess.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (response) => {
        toast.success(
          response.removedSquadCharacterCount > 0
            ? `Dostęp cofnięty. Usunięto ${response.removedSquadCharacterCount} postaci ze składów.`
            : "Dostęp cofnięty."
        );
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listAccountAccessGrants.queryKey({
            input: { accountId },
          }),
        });
      },
    })
  );

  const targets = (searchQuery.data?.users ??
    []) as readonly AccountInviteTarget[];
  const grants = (grantsQuery.data?.grants ??
    []) as readonly AccountAccessGrant[];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label
          className="text-muted-foreground text-xs"
          htmlFor={`share-search-${accountId}`}
        >
          Zaproś użytkownika
        </Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            autoComplete="off"
            className="h-8 pl-8"
            id={`share-search-${accountId}`}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj po nazwie"
            value={query}
          />
        </div>

        {debouncedQuery.trim().length >= 2 && (
          <ul className="space-y-1">
            {searchQuery.isLoading && (
              <li className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="size-3 animate-spin" />
                Szukam…
              </li>
            )}
            {!searchQuery.isLoading && targets.length === 0 && (
              <li className="text-muted-foreground text-xs">
                Brak pasujących zweryfikowanych użytkowników.
              </li>
            )}
            {targets.map((target) => (
              <li
                className="flex items-center justify-between gap-2 rounded-md px-1 py-1"
                key={target.userId}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm">
                    {target.image ? (
                      <AvatarImage alt={target.name} src={target.image} />
                    ) : null}
                    <AvatarFallback>{userInitials(target.name)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{target.name}</span>
                </div>
                <Button
                  disabled={sendMutation.isPending}
                  onClick={() => {
                    void sendMutation.mutate({
                      accountId,
                      invitedUserId: target.userId,
                    });
                  }}
                  size="xs"
                  variant="outline"
                >
                  <UserPlus className="size-3.5" />
                  Zaproś
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <h3 className="text-muted-foreground text-xs">
          Udostępnieni użytkownicy
        </h3>
        {grantsQuery.isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-3 animate-spin" />
            Wczytywanie…
          </div>
        )}
        {!grantsQuery.isLoading && grants.length === 0 && (
          <p className="text-muted-foreground text-xs">
            Nikt nie ma jeszcze dostępu do konta {accountDisplayName}.
          </p>
        )}
        {grants.length > 0 && (
          <ul className="space-y-1">
            {grants.map((grant) => (
              <li
                className="flex items-center justify-between gap-2 rounded-md px-1 py-1"
                key={grant.accessId}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar size="sm">
                    {grant.userImage ? (
                      <AvatarImage alt={grant.userName} src={grant.userImage} />
                    ) : null}
                    <AvatarFallback>
                      {userInitials(grant.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{grant.userName}</span>
                  <Badge
                    variant={
                      grant.status === "accepted" ? "default" : "secondary"
                    }
                  >
                    {grant.status === "accepted" ? "Dostęp" : "Oczekuje"}
                  </Badge>
                </div>
                <Button
                  aria-label={`Cofnij dostęp dla ${grant.userName}`}
                  disabled={revokeMutation.isPending}
                  onClick={() => {
                    void revokeMutation.mutate({ accessId: grant.accessId });
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

interface OwnedAccountRowProps {
  readonly account: OwnedAccount;
}

const changeFieldLabel = (field: string): string => {
  switch (field) {
    case "name": {
      return "Nazwa";
    }
    case "level": {
      return "Poziom";
    }
    case "profession": {
      return "Profesja";
    }
    case "avatarUrl": {
      return "Avatar";
    }
    default: {
      return field;
    }
  }
};

const formatChangeValue = (value: string | number | null): string => {
  if (value === null) {
    return "brak";
  }

  if (typeof value === "string") {
    return PROFESSION_LABELS[value] ?? value;
  }

  return String(value);
};

const OwnedAccountRow = ({ account }: OwnedAccountRowProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [refetchPreview, setRefetchPreview] =
    useState<AccountRefetchPreview | null>(null);

  const previewRefetchMutation = useMutation(
    orpc.squadBuilder.previewAccountRefetch.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (response) => {
        setRefetchPreview(response as AccountRefetchPreview);
      },
    })
  );

  const applyRefetchMutation = useMutation(
    orpc.squadBuilder.applyAccountRefetch.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (response) => {
        toast.success(
          response.removedSquadCharacterCount > 0
            ? `Postacie odświeżone. Usunięto ${response.removedSquadCharacterCount} wpisów ze składów.`
            : "Postacie zostały odświeżone."
        );
        setRefetchPreview(null);
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listOwnedAccounts.queryKey(),
        });
      },
    })
  );

  const hasDiff =
    refetchPreview !== null &&
    (refetchPreview.diff.added.length > 0 ||
      refetchPreview.diff.removed.length > 0 ||
      refetchPreview.diff.changed.length > 0);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <div className="py-3 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-sm">
            {account.displayName}
          </span>
          <Badge variant="secondary">
            {account.characterCount}{" "}
            {account.characterCount === 1 ? "postać" : "postaci"}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <a
            className="inline-flex items-center gap-1 text-primary text-xs underline-offset-4 hover:underline"
            href={account.generatedProfileUrl}
            rel="noopener"
            target="_blank"
          >
            <ExternalLink className="size-3" />
            Profil Margonem
          </a>
          <span className="font-mono text-xs text-muted-foreground">
            #{account.profileId}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Ostatnio pobrano: {formatDateTime(account.lastFetchedAt)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            disabled={previewRefetchMutation.isPending}
            onClick={() => {
              void previewRefetchMutation.mutate({
                accountId: account.accountId,
              });
            }}
            size="sm"
            variant="outline"
          >
            {previewRefetchMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCw className="size-3.5" />
            )}
            Odśwież
          </Button>
          <CollapsibleTrigger
            aria-controls={`share-panel-${account.accountId}`}
            render={
              <Button size="sm" variant={open ? "secondary" : "outline"}>
                <Share2 className="size-3.5" />
                {open ? "Ukryj udostępnianie" : "Udostępnij"}
              </Button>
            }
          />
        </div>

        {refetchPreview !== null && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-1">
              <h3 className="font-medium text-sm">Podgląd odświeżenia</h3>
              <p className="text-muted-foreground text-xs">
                Dodane: {refetchPreview.diff.added.length}, usunięte:{" "}
                {refetchPreview.diff.removed.length}, zmienione:{" "}
                {refetchPreview.diff.changed.length}, bez zmian:{" "}
                {refetchPreview.diff.unchangedCount}
              </p>
              {refetchPreview.diff.removed.length > 0 && (
                <p className="text-destructive text-xs">
                  Usunięte postacie znikną też z zapisanych składów.
                </p>
              )}
              {!hasDiff && (
                <p className="text-muted-foreground text-xs">
                  Nie znaleziono zmian w postaciach z Jaruny.
                </p>
              )}
            </div>

            {refetchPreview.diff.added.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-xs">Dodane postacie</h4>
                <ul className="space-y-1 text-xs">
                  {refetchPreview.diff.added.map((character) => (
                    <li key={character.characterId}>
                      {character.name} {character.level}{" "}
                      {PROFESSION_LABELS[character.profession] ??
                        character.profession}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {refetchPreview.diff.removed.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-xs">
                  Usunięte z Jaruny / profilu
                </h4>
                <ul className="space-y-1 text-xs">
                  {refetchPreview.diff.removed.map((character) => (
                    <li key={character.databaseCharacterId}>
                      {character.name} {character.level}{" "}
                      {PROFESSION_LABELS[character.profession] ??
                        character.profession}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {refetchPreview.diff.changed.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-xs">Zmienione postacie</h4>
                <ul className="space-y-2 text-xs">
                  {refetchPreview.diff.changed.map((character) => (
                    <li key={character.databaseCharacterId}>
                      <span className="font-medium">{character.name}</span>
                      <ul className="ml-4 list-disc text-muted-foreground">
                        {character.changes.map((change) => (
                          <li
                            key={`${character.databaseCharacterId}-${change.field}`}
                          >
                            {changeFieldLabel(change.field)}: z „
                            {formatChangeValue(change.before)}” na „
                            {formatChangeValue(change.after)}”
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={applyRefetchMutation.isPending}
                onClick={() => {
                  void applyRefetchMutation.mutate({
                    refetchPreviewId: refetchPreview.refetchPreviewId,
                  });
                }}
                size="sm"
              >
                {applyRefetchMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Zastosuj zmiany
              </Button>
              <Button
                disabled={applyRefetchMutation.isPending}
                onClick={() => setRefetchPreview(null)}
                size="sm"
                variant="ghost"
              >
                Nie teraz
              </Button>
            </div>
          </div>
        )}

        {open && (
          <CollapsibleContent
            className="mt-3 rounded-lg border border-border bg-muted/30 p-3"
            id={`share-panel-${account.accountId}`}
          >
            <AccountSharingPanel
              accountDisplayName={account.displayName}
              accountId={account.accountId}
            />
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
};

interface OwnedAccountsPanelProps {
  readonly accounts: readonly OwnedAccount[];
  readonly isLoading: boolean;
}

const OwnedAccountsPanel = ({
  accounts,
  isLoading,
}: OwnedAccountsPanelProps) => (
  <aside className="space-y-3 rounded-xl border border-border bg-card p-5">
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 font-semibold text-base">
        <Users className="size-4 text-muted-foreground" />
        Twoje konta
      </h2>
      <span className="font-mono text-xs text-muted-foreground">
        {accounts.length}
      </span>
    </div>

    {isLoading && <OwnedAccountsSkeleton />}

    {!isLoading && accounts.length === 0 && (
      <div className="rounded-lg border border-dashed border-border py-8 text-center">
        <Users
          aria-hidden="true"
          className="mx-auto size-7 text-muted-foreground"
        />
        <p className="mx-auto mt-2 max-w-44 text-muted-foreground text-sm">
          Nie masz jeszcze zapisanych kont. Wklej link do profilu, aby dodać
          postacie z Jaruny.
        </p>
      </div>
    )}

    {!isLoading && accounts.length > 0 && (
      <div className="divide-y divide-border">
        {accounts.map((account) => (
          <OwnedAccountRow account={account} key={account.accountId} />
        ))}
      </div>
    )}
  </aside>
);

const InviteInboxSkeleton = () => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <Skeleton className="h-12 w-full" key={index} />
    ))}
  </div>
);

const InviteInboxPanel = () => {
  const queryClient = useQueryClient();
  const invitesQuery = useQuery(
    orpc.squadBuilder.listIncomingAccountInvites.queryOptions()
  );

  const respondMutation = useMutation(
    orpc.squadBuilder.respondToAccountAccessInvite.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (_response, variables) => {
        toast.success(
          variables.response === "accept"
            ? "Konto zostało zaakceptowane."
            : "Zaproszenie odrzucone."
        );
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listIncomingAccountInvites.queryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listSharedAccounts.queryKey(),
        });
      },
    })
  );

  const invites = (invitesQuery.data?.invites ??
    []) as readonly AccountAccessInvite[];

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Inbox className="size-4 text-muted-foreground" />
          Zaproszenia do kont
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {invites.length}
        </span>
      </div>

      {invitesQuery.isLoading && <InviteInboxSkeleton />}

      {!invitesQuery.isLoading && invites.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <Inbox
            aria-hidden="true"
            className="mx-auto size-7 text-muted-foreground"
          />
          <p className="mx-auto mt-2 max-w-56 text-muted-foreground text-sm">
            Nie masz oczekujących zaproszeń do kont Margonem.
          </p>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background/40 p-3"
              key={invite.accessId}
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
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-sm">
                      {invite.accountDisplayName}
                    </span>
                    <Badge variant="secondary">oczekuje</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Zaproszenie od {invite.ownerUserName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label={`Akceptuj dostęp do ${invite.accountDisplayName}`}
                  disabled={respondMutation.isPending}
                  onClick={() => {
                    void respondMutation.mutate({
                      accessId: invite.accessId,
                      response: "accept",
                    });
                  }}
                  size="sm"
                >
                  <Check className="size-3.5" />
                  Akceptuj
                </Button>
                <Button
                  aria-label={`Odrzuć dostęp do ${invite.accountDisplayName}`}
                  disabled={respondMutation.isPending}
                  onClick={() => {
                    void respondMutation.mutate({
                      accessId: invite.accessId,
                      response: "decline",
                    });
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <X className="size-3.5" />
                  Odrzuć
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const SharedAccountsSkeleton = () => (
  <div className="space-y-2" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <Skeleton className="h-14 w-full" key={index} />
    ))}
  </div>
);

const SharedAccountsPanel = () => {
  const sharedQuery = useQuery(
    orpc.squadBuilder.listSharedAccounts.queryOptions()
  );
  const accounts = (sharedQuery.data?.accounts ??
    []) as readonly SharedAccount[];

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Users className="size-4 text-muted-foreground" />
          Udostępnione mi
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {accounts.length}
        </span>
      </div>

      {sharedQuery.isLoading && <SharedAccountsSkeleton />}

      {!sharedQuery.isLoading && accounts.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <Users
            aria-hidden="true"
            className="mx-auto size-7 text-muted-foreground"
          />
          <p className="mx-auto mt-2 max-w-56 text-muted-foreground text-sm">
            Żadne konto Margonem nie jest Ci jeszcze udostępnione.
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              className="space-y-1 rounded-lg border border-border bg-background/40 p-3"
              key={account.accountId}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-sm">
                  {account.displayName}
                </span>
                <Badge variant="secondary">
                  {account.characterCount}{" "}
                  {account.characterCount === 1 ? "postać" : "postaci"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  {account.ownerUserImage ? (
                    <AvatarImage
                      alt={account.ownerUserName}
                      src={account.ownerUserImage}
                    />
                  ) : null}
                  <AvatarFallback>
                    {userInitials(account.ownerUserName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-xs">
                  Właściciel: {account.ownerUserName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  className="inline-flex items-center gap-1 text-primary text-xs underline-offset-4 hover:underline"
                  href={account.generatedProfileUrl}
                  rel="noopener"
                  target="_blank"
                >
                  <ExternalLink className="size-3" />
                  Profil Margonem
                </a>
                <span className="font-mono text-xs text-muted-foreground">
                  #{account.profileId}
                </span>
              </div>
              <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <Clock className="size-3" />
                Ostatnio pobrano: {formatDateTime(account.lastFetchedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default function SquadBuilderAccountsPage() {
  const queryClient = useQueryClient();
  const [urlsText, setUrlsText] = useState("");
  const [previewItems, setPreviewItems] = useState<readonly PreviewItem[]>([]);
  const [displayNames, setDisplayNames] = useState<Record<number, string>>({});
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const ownedAccountsQuery = useQuery(
    orpc.squadBuilder.listOwnedAccounts.queryOptions()
  );

  const previewMutation = useMutation(
    orpc.squadBuilder.previewOwnedAccountImports.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (response) => {
        const items = response.items as readonly PreviewItem[];
        const initialNames: Record<number, string> = {};

        for (const item of items) {
          if (item.status === "success") {
            initialNames[item.pendingImportId] = item.defaultDisplayName;
          }
        }

        setPreviewItems(items);
        setDisplayNames(initialNames);
      },
    })
  );

  const confirmMutation = useMutation(
    orpc.squadBuilder.confirmOwnedAccountImport.mutationOptions({
      onError: (error) => {
        toast.error(error.message);
      },
      onSuccess: (_response, variables) => {
        setPreviewItems((current) =>
          current.filter(
            (item) =>
              !(
                item.status === "success" &&
                item.pendingImportId === variables.pendingImportId
              )
          )
        );
        toast.success("Konto zostało zapisane");
        void queryClient.invalidateQueries({
          queryKey: orpc.squadBuilder.listOwnedAccounts.queryKey(),
        });
      },
    })
  );

  const profileLines = useMemo(
    () => urlsText.split("\n").filter((line) => line.trim().length > 0),
    [urlsText]
  );

  const canSubmit =
    profileLines.length > 0 &&
    profileLines.length <= MAX_PROFILE_URLS &&
    !previewMutation.isPending;

  const handleSubmitPreview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    void previewMutation.mutate({ profileUrls: urlsText.split("\n") });
  };

  const handleClear = () => {
    setUrlsText("");
    setPreviewItems([]);
    setDisplayNames({});
  };

  const handleConfirm = (item: Extract<PreviewItem, { status: "success" }>) => {
    const displayName = displayNames[item.pendingImportId]?.trim();

    if (displayName === undefined || displayName.length === 0) {
      toast.error("Podaj nazwę konta");
      return;
    }

    setConfirmingId(item.pendingImportId);
    void confirmMutation.mutate(
      { displayName, pendingImportId: item.pendingImportId },
      {
        onSettled: () => setConfirmingId(null),
      }
    );
  };

  const ownedAccounts = (ownedAccountsQuery.data?.accounts ??
    []) as readonly OwnedAccount[];

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Konta Margonem
        </h1>
        <p className="text-muted-foreground text-sm">
          Importuj własne konta, udostępniaj je współgildiom i używaj postaci z
          Jaruny przy budowaniu składów.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <ImportPanel
          canSubmit={canSubmit}
          confirmingId={confirmingId}
          displayNames={displayNames}
          isConfirming={confirmMutation.isPending}
          isPreviewPending={previewMutation.isPending}
          previewItems={previewItems}
          profileLineCount={profileLines.length}
          onClear={handleClear}
          onConfirm={handleConfirm}
          onDisplayNameChange={(pendingImportId, value) => {
            setDisplayNames((current) => ({
              ...current,
              [pendingImportId]: value,
            }));
          }}
          onSubmitPreview={handleSubmitPreview}
          onUrlsChange={setUrlsText}
          urlsText={urlsText}
        />
        <OwnedAccountsPanel
          accounts={ownedAccounts}
          isLoading={ownedAccountsQuery.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SharedAccountsPanel />
        <InviteInboxPanel />
      </div>
    </div>
  );
}
