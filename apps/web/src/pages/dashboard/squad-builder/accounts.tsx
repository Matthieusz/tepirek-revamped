import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import type {
  OwnedMargonemAccountSummarySchema,
  PreviewOwnedAccountImportsPayload,
  PreviewOwnedAccountImportsSuccess,
} from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import type { PreviewAccountRefetchSuccess } from "@tepirek-revamped/api/protocol/squad-builder/account-refetch/account-refetch-schema";
import type { AccountAccessGrantSummarySchema } from "@tepirek-revamped/api/protocol/squad-builder/account-sharing/account-sharing-schema";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
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

import {
  EffectFieldFrame,
  EffectTextField,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/effect-form-fields";
import { AsyncResultFailure } from "@/components/ui/async-result-boundary";
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
import { getErrorMessage, getSquadBuilderLineErrorMessage } from "@/lib/errors";
import {
  AccountDisplayNameSchema,
  getProfileLines,
  MAX_PROFILE_URLS,
  ProfileUrlsSchema,
} from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import {
  confirmOwnedAccountImportAtom,
  ownedAccountsAtom,
  previewOwnedAccountImportsAtom,
} from "@/lib/squad-builder/account-import-atoms";
import {
  applyAccountRefetchAtom,
  previewAccountRefetchAtom,
} from "@/lib/squad-builder/account-refetch-atoms";
import {
  accountAccessGrantsAtom,
  accountInviteTargetsAtom,
  incomingAccountInvitesAtom,
  respondToAccountAccessInviteAtom,
  revokeAccountAccessAtom,
  sendAccountAccessInviteAtom,
  sharedAccountsAtom,
} from "@/lib/squad-builder/account-sharing-atoms";
import { sessionAtom } from "@/lib/user-atoms";
import { formatDateTime } from "@/lib/utils";

const PROFESSION_LABELS: Record<string, string> = {
  bladeDancer: "Tancerz ostrzy",
  hunter: "Łowca",
  mage: "Mag",
  paladin: "Paladyn",
  tracker: "Tropiciel",
  warrior: "Wojownik",
};

interface ProfileUrlsFieldProps {
  readonly disabled?: boolean;
}

const ProfileUrlsField: FormReact.FieldComponent<
  string,
  ProfileUrlsFieldProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const helperId = `${fieldId}-helper`;
  const hasError = Option.isSome(field.error);
  const profileLineCount = getProfileLines(field.value).length;
  const describedBy = [helperId, hasError ? errorId : undefined]
    .filter((id): id is string => id !== undefined)
    .join(" ");

  return (
    <EffectFieldFrame
      error={field.error}
      fieldId={fieldId}
      helperText={
        <p className="text-muted-foreground text-xs" id={helperId}>
          Wklej maksymalnie {MAX_PROFILE_URLS} linków, po jednym w wierszu.
          {profileLineCount > MAX_PROFILE_URLS && (
            <span className="text-destructive">
              {" "}
              Wykryto {profileLineCount} linków, ogranicz listę do{" "}
              {MAX_PROFILE_URLS}.
            </span>
          )}
        </p>
      }
      label="Linki do profili"
    >
      <Textarea
        aria-describedby={describedBy}
        aria-invalid={hasError}
        className="min-h-32 font-mono text-xs"
        disabled={props.disabled}
        id={fieldId}
        name={field.path}
        onBlur={field.onBlur}
        onChange={(event) => field.onChange(event.target.value)}
        placeholder="https://www.margonem.pl/profile/view,7298897"
        value={field.value}
      />
    </EffectFieldFrame>
  );
};

type PreviewOwnedAccountImports = (
  payload: typeof PreviewOwnedAccountImportsPayload.Type
) => Promise<typeof PreviewOwnedAccountImportsSuccess.Type>;

const accountPreviewFormBuilder = FormBuilder.empty.addField(
  "profileUrls",
  ProfileUrlsSchema
);

const accountPreviewForm = FormReact.make(accountPreviewFormBuilder, {
  fields: { profileUrls: ProfileUrlsField },
  mode: { validation: "onSubmit" },
  onSubmit: (
    previewOwnedAccountImports: PreviewOwnedAccountImports,
    { decoded }
  ) => formSubmission(() => previewOwnedAccountImports(decoded)),
});

const accountDisplayNameSchema = AccountDisplayNameSchema;

const accountConfirmationFormBuilder = FormBuilder.empty.addField(
  "displayName",
  accountDisplayNameSchema
);

interface AccountImportConfirmation {
  readonly displayName: string;
  readonly pendingImportId: number;
}

type ConfirmOwnedAccountImport = (
  payload: AccountImportConfirmation
) => Promise<unknown>;

interface AccountConfirmationSubmitArgs {
  readonly confirmOwnedAccountImport: ConfirmOwnedAccountImport;
  readonly pendingImportId: number;
}

const makeAccountConfirmationForm = () =>
  FormReact.make(accountConfirmationFormBuilder, {
    fields: { displayName: EffectTextField },
    mode: { validation: "onSubmit" },
    onSubmit: (
      {
        confirmOwnedAccountImport,
        pendingImportId,
      }: AccountConfirmationSubmitArgs,
      { decoded }
    ) =>
      formSubmission(() =>
        confirmOwnedAccountImport({
          displayName: decoded.displayName.trim(),
          pendingImportId,
        })
      ),
  });

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

type OwnedAccount = typeof OwnedMargonemAccountSummarySchema.Type;

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

type AccountRefetchPreviewApi = typeof PreviewAccountRefetchSuccess.Type;

type AccountAccessGrant = typeof AccountAccessGrantSummarySchema.Type;

const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
};

const useActorUserId = (): string => {
  const sessionResult = useAtomValue(sessionAtom);
  return sessionResult._tag === "Success" ? sessionResult.value.user.id : "";
};

const userInitials = (name: string): string =>
  name
    .split(/\s+/u)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const PreviewSkeleton = () => (
  <ul className="divide-y divide-border" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <li className="space-y-2 px-5 py-3" key={index}>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-full" />
      </li>
    ))}
  </ul>
);

interface PreviewRowProps {
  readonly confirmingId: number | null;
  readonly isConfirming: boolean;
  readonly item: PreviewItem;
  readonly onConfirm: (
    item: Extract<PreviewItem, { status: "success" }>,
    payload: AccountImportConfirmation
  ) => Promise<unknown>;
  readonly onConfirmed: (
    item: Extract<PreviewItem, { status: "success" }>
  ) => void;
}

const PreviewRow = ({
  confirmingId,
  isConfirming,
  item,
  onConfirm,
  onConfirmed,
}: PreviewRowProps) => {
  const confirmationForm = useMemo(makeAccountConfirmationForm, []);
  const submit = useAtomSet(confirmationForm.submit);
  const reset = useAtomSet(confirmationForm.reset);
  const submitResult = useAtomValue(confirmationForm.submit);

  useEffect(() => {
    if (item.status === "success" && AsyncResult.isSuccess(submitResult)) {
      reset();
      onConfirmed(item);
    }
  }, [item, onConfirmed, reset, submitResult]);

  if (item.status === "error") {
    return (
      <li className="flex items-start gap-3 px-5 py-3">
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
  const isDisabled = isConfirming || submitResult.waiting;

  return (
    <li className="space-y-3 px-5 py-3">
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

      <confirmationForm.Initialize
        defaultValues={{ displayName: item.defaultDisplayName }}
      >
        <form
          className="flex flex-wrap items-end gap-2 pl-7"
          action={() =>
            submit({
              confirmOwnedAccountImport: (payload) => onConfirm(item, payload),
              pendingImportId: item.pendingImportId,
            })
          }
        >
          <confirmationForm.displayName
            className="min-w-40 flex-1"
            disabled={isDisabled}
            id={`displayName-${item.pendingImportId}`}
            label="Nazwa konta"
            maxLength={80}
            placeholder="Nazwa konta"
          />
          <Button
            aria-label={`Zapisz konto ${item.suggestedAccountName}`}
            disabled={isDisabled}
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
      </confirmationForm.Initialize>
    </li>
  );
};

interface ImportPanelProps {
  readonly confirmingId: number | null;
  readonly isConfirming: boolean;
  readonly isPreviewPending: boolean;
  readonly previewItems: readonly PreviewItem[];
  readonly onClear: () => void;
  readonly onConfirm: (
    item: Extract<PreviewItem, { status: "success" }>,
    payload: AccountImportConfirmation
  ) => Promise<unknown>;
  readonly onConfirmed: (
    item: Extract<PreviewItem, { status: "success" }>
  ) => void;
  readonly onSubmitPreview: () => void;
}

const ImportPanel = ({
  confirmingId,
  isConfirming,
  isPreviewPending,
  previewItems,
  onClear,
  onConfirm,
  onConfirmed,
  onSubmitPreview,
}: ImportPanelProps) => (
  <section className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="border-b border-border px-5 py-3">
      <h2 className="flex items-center gap-2 font-semibold text-base">
        <Link2 className="size-4 text-muted-foreground" />
        Import kont
      </h2>
      <p className="text-muted-foreground text-sm">
        Wklej linki do profili Margonem, aby pobrać postacie z Jaruny.
      </p>
    </div>

    <form
      action={onSubmitPreview}
      className="space-y-4 border-b border-border px-5 py-4"
    >
      <accountPreviewForm.profileUrls disabled={isPreviewPending} />

      <div className="flex items-center gap-2">
        <Button disabled={isPreviewPending} type="submit">
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
      <ul className="divide-y divide-border">
        {previewItems.map((item) => (
          <PreviewRow
            confirmingId={confirmingId}
            isConfirming={isConfirming}
            item={item}
            key={item.lineNumber}
            onConfirm={onConfirm}
            onConfirmed={onConfirmed}
          />
        ))}
      </ul>
    )}
  </section>
);

const OwnedAccountsSkeleton = () => (
  <ul className="divide-y divide-border" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <li className="space-y-2 px-5 py-3" key={index}>
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
  const actorUserId = useActorUserId();
  const [query, setQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const trimmedQuery = debouncedQuery.trim();

  const grantsAtom = accountAccessGrantsAtom(accountId, actorUserId);
  const searchAtom = accountInviteTargetsAtom(accountId, trimmedQuery);
  const grantsResult = useAtomValue(grantsAtom);
  const searchResult = useAtomValue(searchAtom);
  const refreshGrants = useAtomRefresh(grantsAtom);
  const refreshSearch = useAtomRefresh(searchAtom);
  const sendInvite = useAtomSet(sendAccountAccessInviteAtom, {
    mode: "promise",
  });
  const revokeAccess = useAtomSet(revokeAccountAccessAtom, {
    mode: "promise",
  });

  const targets =
    trimmedQuery.length >= 2 && AsyncResult.isSuccess(searchResult)
      ? searchResult.value
      : [];
  const grants: readonly AccountAccessGrant[] = AsyncResult.isSuccess(
    grantsResult
  )
    ? grantsResult.value
    : [];

  if (AsyncResult.isFailure(grantsResult)) {
    return (
      <AsyncResultFailure
        message="Nie udało się wczytać udostępnionych użytkowników."
        onRetry={refreshGrants}
      />
    );
  }

  if (trimmedQuery.length >= 2 && AsyncResult.isFailure(searchResult)) {
    return (
      <AsyncResultFailure
        message="Nie udało się wyszukać użytkowników."
        onRetry={refreshSearch}
      />
    );
  }

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
            {!AsyncResult.isSuccess(searchResult) && (
              <li className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="size-3 animate-spin" />
                Szukam…
              </li>
            )}
            {AsyncResult.isSuccess(searchResult) && targets.length === 0 && (
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
                  disabled={isSending}
                  onClick={() => {
                    const send = async () => {
                      setIsSending(true);
                      try {
                        await sendInvite({
                          accountId,
                          actorUserId,
                          invitedUserId: target.userId,
                        });
                        toast.success(
                          `Zaproszenie wysłane do ${target.userId}`
                        );
                        setQuery("");
                      } catch (error: unknown) {
                        toast.error(
                          getErrorMessage(
                            error,
                            "Nie udało się wysłać zaproszenia"
                          )
                        );
                      } finally {
                        setIsSending(false);
                      }
                    };

                    void send();
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
        {!AsyncResult.isSuccess(grantsResult) && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-3 animate-spin" />
            Wczytywanie…
          </div>
        )}
        {AsyncResult.isSuccess(grantsResult) && grants.length === 0 && (
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
                    {grant.invitedUserImage ? (
                      <AvatarImage
                        alt={grant.invitedUserName}
                        src={grant.invitedUserImage}
                      />
                    ) : null}
                    <AvatarFallback>
                      {userInitials(grant.invitedUserName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">
                    {grant.invitedUserName}
                  </span>
                  <Badge
                    variant={
                      grant.status === "accepted" ? "default" : "secondary"
                    }
                  >
                    {grant.status === "accepted" ? "Dostęp" : "Oczekuje"}
                  </Badge>
                </div>
                <Button
                  aria-label={`Cofnij dostęp dla ${grant.invitedUserName}`}
                  disabled={isRevoking}
                  onClick={() => {
                    const revoke = async () => {
                      setIsRevoking(true);
                      try {
                        const response = await revokeAccess({
                          accessId: grant.accessId,
                          accountId,
                          actorUserId,
                        });
                        toast.success(
                          response.removedSquadCharacterCount > 0
                            ? `Dostęp cofnięty. Usunięto ${response.removedSquadCharacterCount} postaci ze składów.`
                            : "Dostęp cofnięty."
                        );
                      } catch (error: unknown) {
                        toast.error(
                          getErrorMessage(error, "Nie udało się cofnąć dostępu")
                        );
                      } finally {
                        setIsRevoking(false);
                      }
                    };

                    void revoke();
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

const toAccountRefetchPreview = (
  preview: AccountRefetchPreviewApi
): AccountRefetchPreview => ({
  diff: {
    added: preview.diff.added.map(({ latest }) => ({
      avatarUrl: latest.avatarUrl,
      characterId: latest.characterId,
      level: latest.level,
      name: latest.name,
      profession: latest.profession,
    })),
    changed: preview.diff.changed.map((character) => ({
      changes: character.changes,
      characterId: character.margonemCharacterId,
      databaseCharacterId: character.databaseCharacterId,
      name: character.latest.name,
    })),
    removed: preview.diff.removed.map(({ current }) => ({
      affectedSquadCount: current.affectedSquadCount,
      avatarUrl: current.avatarUrl,
      characterId: current.margonemCharacterId,
      databaseCharacterId: current.databaseCharacterId,
      level: current.level,
      name: current.name,
      profession: current.profession,
    })),
    unchangedCount: preview.diff.unchangedCount,
  },
  refetchPreviewId: preview.refetchPreviewId,
});

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
  const [open, setOpen] = useState(false);
  const [isPreviewingRefetch, setIsPreviewingRefetch] = useState(false);
  const [isApplyingRefetch, setIsApplyingRefetch] = useState(false);
  const [refetchPreview, setRefetchPreview] =
    useState<AccountRefetchPreview | null>(null);
  const previewRefetch = useAtomSet(previewAccountRefetchAtom, {
    mode: "promise",
  });
  const applyRefetch = useAtomSet(applyAccountRefetchAtom, {
    mode: "promise",
  });

  const hasDiff =
    refetchPreview !== null &&
    (refetchPreview.diff.added.length > 0 ||
      refetchPreview.diff.removed.length > 0 ||
      refetchPreview.diff.changed.length > 0);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <div className="px-5 py-3">
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
            disabled={isPreviewingRefetch}
            onClick={() => {
              const preview = async () => {
                setIsPreviewingRefetch(true);
                try {
                  const response = await previewRefetch({
                    accountId: account.accountId,
                  });
                  setRefetchPreview(toAccountRefetchPreview(response));
                } catch (error: unknown) {
                  toast.error(
                    getErrorMessage(
                      error,
                      "Nie udało się przygotować odświeżenia"
                    )
                  );
                } finally {
                  setIsPreviewingRefetch(false);
                }
              };

              void preview();
            }}
            size="sm"
            variant="outline"
          >
            {isPreviewingRefetch ? (
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
          <div className="mt-3 space-y-3 rounded-lg bg-muted/50 p-3">
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
                disabled={isApplyingRefetch}
                onClick={() => {
                  const apply = async () => {
                    setIsApplyingRefetch(true);
                    try {
                      const response = await applyRefetch({
                        refetchPreviewId: refetchPreview.refetchPreviewId,
                      });
                      toast.success(
                        response.removedSquadCharacterCount > 0
                          ? `Postacie odświeżone. Usunięto ${response.removedSquadCharacterCount} wpisów ze składów.`
                          : "Postacie zostały odświeżone."
                      );
                      setRefetchPreview(null);
                    } catch (error: unknown) {
                      toast.error(
                        getErrorMessage(
                          error,
                          "Nie udało się zastosować odświeżenia"
                        )
                      );
                    } finally {
                      setIsApplyingRefetch(false);
                    }
                  };

                  void apply();
                }}
                size="sm"
              >
                {isApplyingRefetch ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Zastosuj zmiany
              </Button>
              <Button
                disabled={isApplyingRefetch}
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
            className="mt-3 rounded-lg bg-muted/50 p-3"
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
  <aside className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="flex items-center justify-between border-b border-border px-5 py-3">
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
      <div className="px-5 py-10 text-center">
        <Users
          aria-hidden="true"
          className="mx-auto size-7 text-muted-foreground"
        />
        <p className="mx-auto mt-2 max-w-52 text-muted-foreground text-sm">
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
  <div className="space-y-2 px-5 py-3" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <Skeleton className="h-12 w-full" key={index} />
    ))}
  </div>
);

const InviteInboxPanel = () => {
  const [isResponding, setIsResponding] = useState(false);
  const invitesAtom = incomingAccountInvitesAtom;
  const invitesResult = useAtomValue(invitesAtom);
  const refreshInvites = useAtomRefresh(invitesAtom);
  const respondToInvite = useAtomSet(respondToAccountAccessInviteAtom, {
    mode: "promise",
  });

  const invites = AsyncResult.isSuccess(invitesResult)
    ? invitesResult.value
    : [];

  if (AsyncResult.isFailure(invitesResult)) {
    return (
      <AsyncResultFailure
        message="Nie udało się wczytać zaproszeń do kont."
        onRetry={refreshInvites}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Inbox className="size-4 text-muted-foreground" />
          Zaproszenia do kont
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {invites.length}
        </span>
      </div>

      {!AsyncResult.isSuccess(invitesResult) && <InviteInboxSkeleton />}

      {AsyncResult.isSuccess(invitesResult) && invites.length === 0 && (
        <div className="px-5 py-8 text-center">
          <Inbox
            aria-hidden="true"
            className="mx-auto size-6 text-muted-foreground"
          />
          <p className="mx-auto mt-2 max-w-56 text-muted-foreground text-sm">
            Nie masz oczekujących zaproszeń do kont Margonem.
          </p>
        </div>
      )}

      {invites.length > 0 && (
        <ul className="divide-y divide-border">
          {invites.map((invite) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
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
                  <p className="font-mono text-xs text-muted-foreground">
                    Zaproszenie od {invite.ownerUserName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label={`Akceptuj dostęp do ${invite.accountDisplayName}`}
                  disabled={isResponding}
                  onClick={() => {
                    void (async () => {
                      setIsResponding(true);
                      try {
                        await respondToInvite({
                          accessId: invite.accessId,
                          response: "accept",
                        });
                        toast.success("Konto zostało zaakceptowane.");
                      } catch (error: unknown) {
                        toast.error(
                          getErrorMessage(
                            error,
                            "Nie udało się odpowiedzieć na zaproszenie"
                          )
                        );
                      } finally {
                        setIsResponding(false);
                      }
                    })();
                  }}
                  size="sm"
                >
                  <Check className="size-3.5" />
                  Akceptuj
                </Button>
                <Button
                  aria-label={`Odrzuć dostęp do ${invite.accountDisplayName}`}
                  disabled={isResponding}
                  onClick={() => {
                    void (async () => {
                      setIsResponding(true);
                      try {
                        await respondToInvite({
                          accessId: invite.accessId,
                          response: "decline",
                        });
                        toast.success("Zaproszenie odrzucone.");
                      } catch (error: unknown) {
                        toast.error(
                          getErrorMessage(
                            error,
                            "Nie udało się odpowiedzieć na zaproszenie"
                          )
                        );
                      } finally {
                        setIsResponding(false);
                      }
                    })();
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
  <div className="space-y-2 px-5 py-3" aria-hidden="true">
    {Array.from({ length: 2 }, (_, index) => (
      <Skeleton className="h-14 w-full" key={index} />
    ))}
  </div>
);

const SharedAccountsPanel = () => {
  const sharedResult = useAtomValue(sharedAccountsAtom);
  const refreshSharedAccounts = useAtomRefresh(sharedAccountsAtom);
  const accounts = AsyncResult.isSuccess(sharedResult)
    ? sharedResult.value
    : [];

  if (AsyncResult.isFailure(sharedResult)) {
    return (
      <AsyncResultFailure
        message="Nie udało się wczytać udostępnionych kont."
        onRetry={refreshSharedAccounts}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Users className="size-4 text-muted-foreground" />
          Udostępnione mi
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {accounts.length}
        </span>
      </div>

      {!AsyncResult.isSuccess(sharedResult) && <SharedAccountsSkeleton />}

      {AsyncResult.isSuccess(sharedResult) && accounts.length === 0 && (
        <div className="px-5 py-8 text-center">
          <Users
            aria-hidden="true"
            className="mx-auto size-6 text-muted-foreground"
          />
          <p className="mx-auto mt-2 max-w-56 text-muted-foreground text-sm">
            Żadne konto Margonem nie jest Ci jeszcze udostępnione.
          </p>
        </div>
      )}

      {accounts.length > 0 && (
        <ul className="divide-y divide-border">
          {accounts.map((account) => (
            <li className="space-y-1.5 px-5 py-3" key={account.accountId}>
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
  const [previewItems, setPreviewItems] = useState<readonly PreviewItem[]>([]);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const ownedAccountsResult = useAtomValue(ownedAccountsAtom);
  const refreshOwnedAccounts = useAtomRefresh(ownedAccountsAtom);
  const previewImports = useAtomSet(previewOwnedAccountImportsAtom, {
    mode: "promise",
  });
  const confirmImport = useAtomSet(confirmOwnedAccountImportAtom, {
    mode: "promise",
  });

  const submitPreview = useAtomSet(accountPreviewForm.submit);
  const resetPreview = useAtomSet(accountPreviewForm.reset);
  const previewSubmitResult = useAtomValue(accountPreviewForm.submit);
  const isPreviewPending = previewSubmitResult.waiting;
  const isConfirming = confirmingId !== null;

  useEffect(() => {
    if (!AsyncResult.isSuccess(previewSubmitResult)) {
      return;
    }

    const items = previewSubmitResult.value.items.map((item) =>
      item._tag === "PreviewSucceeded"
        ? {
            ...item,
            characterCount: item.jarunaCharacters.length,
            lastFetchedAt: item.lastFetchedAt.toISOString(),
            status: "success" as const,
          }
        : {
            errorTag: item.error._tag,
            inputUrl: item.inputUrl,
            lineNumber: item.lineNumber,
            message: getSquadBuilderLineErrorMessage(item.error),
            status: "error" as const,
          }
    );
    setPreviewItems(items);
  }, [previewSubmitResult]);

  const handleClear = () => {
    resetPreview();
    setPreviewItems([]);
  };

  const handleConfirm = (
    item: Extract<PreviewItem, { status: "success" }>,
    payload: AccountImportConfirmation
  ): Promise<unknown> => {
    setConfirmingId(item.pendingImportId);
    return confirmImport(payload).finally(() => setConfirmingId(null));
  };

  const handleConfirmed = (
    item: Extract<PreviewItem, { status: "success" }>
  ) => {
    setPreviewItems((current) =>
      current.filter(
        (currentItem) =>
          !(
            currentItem.status === "success" &&
            currentItem.pendingImportId === item.pendingImportId
          )
      )
    );
    toast.success("Konto zostało zapisane");
  };

  const ownedAccounts = AsyncResult.isSuccess(ownedAccountsResult)
    ? ownedAccountsResult.value
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
          Konta Margonem
        </h1>
        <p className="text-muted-foreground text-sm">
          Importuj własne konta, udostępniaj je współgildiom i używaj postaci z
          Jaruny przy budowaniu składów.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-6">
          <accountPreviewForm.Initialize defaultValues={{ profileUrls: "" }}>
            <ImportPanel
              confirmingId={confirmingId}
              isConfirming={isConfirming}
              isPreviewPending={isPreviewPending}
              previewItems={previewItems}
              onClear={handleClear}
              onConfirm={handleConfirm}
              onConfirmed={handleConfirmed}
              onSubmitPreview={() => submitPreview(() => previewImports)}
            />
          </accountPreviewForm.Initialize>
          {AsyncResult.isFailure(ownedAccountsResult) ? (
            <AsyncResultFailure
              message="Nie udało się wczytać zapisanych kont."
              onRetry={refreshOwnedAccounts}
            />
          ) : (
            <OwnedAccountsPanel
              accounts={ownedAccounts}
              isLoading={!AsyncResult.isSuccess(ownedAccountsResult)}
            />
          )}
        </div>
        <div className="space-y-6">
          <InviteInboxPanel />
          <SharedAccountsPanel />
        </div>
      </div>
    </div>
  );
}
