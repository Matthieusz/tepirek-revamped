import { useAtomSet } from "@effect/atom-react";
import { useSelector } from "@tanstack/react-form";
import * as Schema from "effect/Schema";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Link2,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/app-form";
import { Form, FormFeedback } from "@/components/forms/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge as ReuiBadge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from "@/components/reui/stepper";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  AccountDisplayNameSchema,
  getProfileLines,
  MAX_PROFILE_URLS,
  ProfileUrlsSchema,
} from "@/features/squad-builder/account-form-schemas";
import {
  confirmOwnedAccountImportAtom,
  previewOwnedAccountImportsAtom,
} from "@/features/squad-builder/account-import-atoms";
import { getSquadBuilderLineErrorMessage } from "@/lib/errors";
import type { FormSubmissionError } from "@/lib/form-submission";
import { runFormSubmission } from "@/lib/form-submission";
import { getProfessionPresentation } from "@/routes/dashboard/squad-builder/-components/profession-presenters";

const AccountPreviewFormSchema = Schema.Struct({
  profileUrls: ProfileUrlsSchema,
});
const AccountPreviewFormValidator = Schema.toStandardSchemaV1(
  AccountPreviewFormSchema
);

const AccountConfirmationFormSchema = Schema.Struct({
  displayName: AccountDisplayNameSchema,
});
const AccountConfirmationFormValidator = Schema.toStandardSchemaV1(
  AccountConfirmationFormSchema
);

const DEFAULT_ACCOUNT_PREVIEW_VALUES = { profileUrls: "" };

interface AccountImportConfirmation {
  readonly displayName: string;
  readonly pendingImportId: number;
}

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

interface PreviewRowProps {
  readonly confirmingId: number | null;
  readonly isConfirming: boolean;
  readonly item: PreviewItem;
  readonly onConfirm: (
    item: Extract<PreviewItem, { status: "success" }>,
    payload: AccountImportConfirmation
  ) => Promise<void>;
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
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const form = useAppForm({
    defaultValues: {
      displayName: item.status === "success" ? item.defaultDisplayName : "",
    },
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded =
        await AccountConfirmationFormValidator["~standard"].validate(value);
      if (!("value" in decoded) || item.status === "error") {
        return;
      }
      const result = await runFormSubmission(() =>
        onConfirm(item, {
          displayName: decoded.value.displayName.trim(),
          pendingImportId: item.pendingImportId,
        })
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }
      form.reset();
      onConfirmed(item);
    },
    validators: { onSubmit: AccountConfirmationFormValidator },
  });
  const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

  if (item.status === "error") {
    return (
      <li className="px-5 py-3">
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>
            Wiersz {item.lineNumber}: nie udało się wczytać profilu
          </AlertTitle>
          <AlertDescription>
            <span className="font-mono text-xs break-all">{item.inputUrl}</span>
            <p>{item.message}</p>
          </AlertDescription>
        </Alert>
      </li>
    );
  }

  const isConfirmingThis = confirmingId === item.pendingImportId;
  const isDisabled = isConfirming || isSubmitting;

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <CheckCircle2
          aria-hidden="true"
          className="text-primary mt-0.5 size-4 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {item.suggestedAccountName}
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                #{item.profileId}
              </span>
              <ReuiBadge variant="secondary">
                {item.characterCount}{" "}
                {item.characterCount === 1 ? "postać" : "postaci"}
              </ReuiBadge>
            </div>
            {item.jarunaCharacters.length > 0 ? (
              <ul
                aria-label={`Postacie konta ${item.suggestedAccountName}`}
                className="space-y-1.5 pt-1"
              >
                {item.jarunaCharacters.map((character) => {
                  const profession = getProfessionPresentation(
                    character.profession
                  );
                  const ProfessionIcon = profession.icon;

                  return (
                    <li
                      className="flex min-w-0 items-start gap-1.5 text-xs"
                      key={character.characterId}
                    >
                      <ChevronRight
                        aria-hidden="true"
                        className="text-muted-foreground mt-0.5 size-3 shrink-0"
                      />
                      <ProfessionIcon
                        aria-hidden="true"
                        className={`mt-0.5 size-3.5 shrink-0 ${profession.colorClass}`}
                      />
                      <span className="min-w-0 font-medium break-words">
                        {character.name}
                      </span>
                      <span className="text-muted-foreground shrink-0 font-mono">
                        {character.level}
                      </span>
                      <span
                        className={`min-w-0 break-words ${profession.colorClass}`}
                      >
                        {profession.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground pt-1 text-xs">
                Brak postaci z Jaruny.
              </p>
            )}
          </div>

          <form.AppForm>
            <Form className="flex flex-wrap items-end gap-2" form={form}>
              <form.AppField name="displayName">
                {(field) => (
                  <field.TextField
                    className="min-w-40 flex-1"
                    disabled={isDisabled}
                    id={`displayName-${item.pendingImportId}`}
                    label="Nazwa konta"
                    maxLength={80}
                    placeholder="Nazwa konta"
                  />
                )}
              </form.AppField>
              <FormFeedback failure={submissionFailure} />
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
            </Form>
          </form.AppForm>
        </div>
      </div>
    </li>
  );
};

interface ImportPanelProps {
  readonly activeStep: 1 | 2;
  readonly confirmingId: number | null;
  readonly isConfirming: boolean;
  readonly isPreviewPending: boolean;
  readonly previewItems: readonly PreviewItem[];
  readonly onClear: () => void;
  readonly onConfirm: (
    item: Extract<PreviewItem, { status: "success" }>,
    payload: AccountImportConfirmation
  ) => Promise<void>;
  readonly onConfirmed: (
    item: Extract<PreviewItem, { status: "success" }>
  ) => void;
  readonly onStepChange: (step: 1 | 2) => void;
  readonly previewForm: ReactNode;
}

const ImportPanel = ({
  activeStep,
  confirmingId,
  isConfirming,
  isPreviewPending,
  previewItems,
  onClear,
  onConfirm,
  onConfirmed,
  onStepChange,
  previewForm,
}: ImportPanelProps) => (
  <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
    <FramePanel className="p-0 shadow-none">
      <div className="border-border border-b px-5 py-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Link2 className="text-muted-foreground size-4" />
          Import kont
        </h2>
        <p className="text-muted-foreground text-sm">
          Wklej linki do profili Margonem, aby pobrać postacie z Jaruny.
        </p>
      </div>

      <Stepper
        value={activeStep}
        onValueChange={(value) => {
          onStepChange(value === 2 ? 2 : 1);
        }}
      >
        <StepperNav className="border-border border-b px-5 py-3">
          <StepperItem
            completed={activeStep === 2}
            loading={isPreviewPending}
            step={1}
          >
            <StepperTrigger>
              <StepperIndicator>1</StepperIndicator>
              <StepperTitle>Wklej profile</StepperTitle>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem disabled={previewItems.length === 0} step={2}>
            <StepperTrigger>
              <StepperIndicator>2</StepperIndicator>
              <StepperTitle>Sprawdź i zapisz</StepperTitle>
            </StepperTrigger>
          </StepperItem>
        </StepperNav>
        <StepperPanel>
          <StepperContent value={1}>{previewForm}</StepperContent>

          <StepperContent value={2}>
            <p className="sr-only" aria-live="polite">
              {previewItems.filter((item) => item.status === "success").length}{" "}
              kont gotowych,{" "}
              {previewItems.filter((item) => item.status === "error").length}{" "}
              błędów
            </p>

            {previewItems.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
                <CheckCircle2
                  aria-hidden="true"
                  className="text-success size-7"
                />
                <div>
                  <h3 className="font-medium">
                    Wszystkie konta zostały zapisane
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Możesz dodać kolejne profile Margonem.
                  </p>
                </div>
                <Button onClick={onClear} type="button" variant="outline">
                  Dodaj kolejne konta
                </Button>
              </div>
            )}

            {isPreviewPending && previewItems.length === 0 && (
              <LoadingSpinner />
            )}

            {previewItems.length > 0 && (
              <ul className="divide-border divide-y">
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
          </StepperContent>
        </StepperPanel>
      </Stepper>
    </FramePanel>
  </Frame>
);

/** Renders and owns the complete two-stage account import workflow. */
export const AccountImportFrame = () => {
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [previewItems, setPreviewItems] = useState<readonly PreviewItem[]>([]);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [submissionFailure, setSubmissionFailure] =
    useState<FormSubmissionError>();
  const previewImports = useAtomSet(previewOwnedAccountImportsAtom, {
    mode: "promise",
  });
  const confirmImport = useAtomSet(confirmOwnedAccountImportAtom, {
    mode: "promise",
  });
  const form = useAppForm({
    defaultValues: DEFAULT_ACCOUNT_PREVIEW_VALUES,
    onSubmit: async ({ value }) => {
      setSubmissionFailure(undefined);
      const decoded =
        await AccountPreviewFormValidator["~standard"].validate(value);
      if (!("value" in decoded)) {
        return;
      }
      const result = await runFormSubmission(() =>
        previewImports(decoded.value)
      );
      if (result._tag === "failure") {
        setSubmissionFailure(result.error);
        return;
      }
      setPreviewItems(
        result.value.items.map((item) =>
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
        )
      );
      setActiveStep(2);
    },
    validators: { onSubmit: AccountPreviewFormValidator },
  });
  const isPreviewPending = useSelector(
    form.store,
    (state) => state.isSubmitting
  );
  const clearImport = (): void => {
    form.reset();
    setSubmissionFailure(undefined);
    setPreviewItems([]);
    setActiveStep(1);
  };
  const profileUrls = useSelector(
    form.store,
    (state) => state.values.profileUrls
  );
  const profileLineCount = getProfileLines(profileUrls).length;
  const previewForm = (
    <Form className="border-border space-y-4 border-b px-5 py-4" form={form}>
      <form.AppField name="profileUrls">
        {(field) => (
          <field.TextareaField
            disabled={isPreviewPending}
            helperText={
              <p className="text-muted-foreground text-xs">
                Wklej maksymalnie {MAX_PROFILE_URLS} linków, po jednym w
                wierszu.
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
          />
        )}
      </form.AppField>
      <FormFeedback failure={submissionFailure} />
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
            disabled={isPreviewPending || confirmingId !== null}
            onClick={clearImport}
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
            Wyczyść
          </Button>
        )}
      </div>
    </Form>
  );

  return (
    <ImportPanel
      activeStep={activeStep}
      confirmingId={confirmingId}
      previewForm={previewForm}
      isConfirming={confirmingId !== null}
      isPreviewPending={isPreviewPending}
      onClear={clearImport}
      onConfirm={async (item, payload) => {
        setConfirmingId(item.pendingImportId);
        try {
          await confirmImport(payload);
        } finally {
          setConfirmingId(null);
        }
      }}
      onConfirmed={(item) => {
        setPreviewItems((current) =>
          current.filter(
            (currentItem) =>
              currentItem.status === "error" ||
              currentItem.pendingImportId !== item.pendingImportId
          )
        );
        toast.success("Konto zostało zapisane");
      }}
      onStepChange={setActiveStep}
      previewItems={previewItems}
    />
  );
};
