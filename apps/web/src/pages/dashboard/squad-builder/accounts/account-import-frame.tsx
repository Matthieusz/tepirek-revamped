import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import type {
  PreviewOwnedAccountImportsPayload,
  PreviewOwnedAccountImportsSuccess,
} from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Link2,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/effect-form-field-helpers";
import {
  EffectFieldFrame,
  EffectTextField,
} from "@/components/forms/effect-form-fields";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getSquadBuilderLineErrorMessage } from "@/lib/errors";
import {
  AccountDisplayNameSchema,
  getProfileLines,
  MAX_PROFILE_URLS,
  ProfileUrlsSchema,
} from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import {
  confirmOwnedAccountImportAtom,
  previewOwnedAccountImportsAtom,
} from "@/lib/squad-builder/account-import-atoms";
import { getProfessionPresentation } from "@/pages/dashboard/squad-builder/profession-presenters";

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
  const describedBy = Arr.filter(
    [helperId, hasError ? errorId : undefined],
    Predicate.isString
  ).join(" ");

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

const DEFAULT_ACCOUNT_PREVIEW_VALUES = { profileUrls: "" } as const;

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
  const isDirty = useAtomValue(confirmationForm.isDirty);
  useEffectFormProtection(isDirty);

  if (item.status === "error") {
    return (
      <li className="px-5 py-3">
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>
            Wiersz {item.lineNumber}: nie udało się wczytać profilu
          </AlertTitle>
          <AlertDescription>
            <span className="break-all font-mono text-xs">{item.inputUrl}</span>
            <p>{item.message}</p>
          </AlertDescription>
        </Alert>
      </li>
    );
  }

  const isConfirmingThis = confirmingId === item.pendingImportId;
  const isDisabled = isConfirming || submitResult.waiting;

  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <CheckCircle2
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-primary"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">
                {item.suggestedAccountName}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
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
                        className="mt-0.5 size-3 shrink-0 text-muted-foreground"
                      />
                      <ProfessionIcon
                        aria-hidden="true"
                        className={`mt-0.5 size-3.5 shrink-0 ${profession.colorClass}`}
                      />
                      <span className="min-w-0 break-words font-medium">
                        {character.name}
                      </span>
                      <span className="shrink-0 font-mono text-muted-foreground">
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
              <p className="pt-1 text-muted-foreground text-xs">
                Brak postaci z Jaruny.
              </p>
            )}
          </div>

          <confirmationForm.Initialize
            defaultValues={{ displayName: item.defaultDisplayName }}
          >
            <EffectFormFeedback result={submitResult} />
            <EffectForm
              action={() =>
                submit({
                  confirmOwnedAccountImport: async (payload) => {
                    const result = await onConfirm(item, payload);
                    reset();
                    onConfirmed(item);
                    return result;
                  },
                  pendingImportId: item.pendingImportId,
                })
              }
              className="flex flex-wrap items-end gap-2"
              submitResult={submitResult}
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
            </EffectForm>
          </confirmationForm.Initialize>
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
  ) => Promise<unknown>;
  readonly onConfirmed: (
    item: Extract<PreviewItem, { status: "success" }>
  ) => void;
  readonly onSubmitPreview: () => void;
  readonly onStepChange: (step: 1 | 2) => void;
  readonly submitResult: AsyncResult.AsyncResult<unknown, unknown>;
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
  onSubmitPreview,
  onStepChange,
  submitResult,
}: ImportPanelProps) => (
  <Frame className="[--frame-radius:var(--radius-lg)]" spacing="sm">
    <FramePanel className="p-0 shadow-none">
      <div className="border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-semibold text-base">
          <Link2 className="size-4 text-muted-foreground" />
          Import kont
        </h2>
        <p className="text-muted-foreground text-sm">
          Wklej linki do profili Margonem, aby pobrać postacie z Jaruny.
        </p>
      </div>

      <Stepper
        value={activeStep}
        onValueChange={(value) => onStepChange(value === 2 ? 2 : 1)}
      >
        <StepperNav className="border-b border-border px-5 py-3">
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
          <StepperContent value={1}>
            <EffectForm
              action={onSubmitPreview}
              className="space-y-4 border-b border-border px-5 py-4"
              submitResult={submitResult}
            >
              <accountPreviewForm.profileUrls disabled={isPreviewPending} />
              <EffectFormFeedback result={submitResult} />

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
            </EffectForm>
          </StepperContent>

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
                  className="size-7 text-success"
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
              <PreviewSkeleton />
            )}

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
  const isResettingRef = useRef(false);
  const previewImports = useAtomSet(previewOwnedAccountImportsAtom, {
    mode: "promise",
  });
  const confirmImport = useAtomSet(confirmOwnedAccountImportAtom, {
    mode: "promise",
  });
  const submitPreview = useAtomSet(accountPreviewForm.submit);
  const resetPreview = useAtomSet(accountPreviewForm.reset);
  const submitResult = useAtomValue(accountPreviewForm.submit);
  const previewIsDirty = useAtomValue(accountPreviewForm.isDirty);
  useEffectFormProtection(previewIsDirty, submitResult.waiting);

  useEffect(() => {
    if (!AsyncResult.isSuccess(submitResult)) {
      isResettingRef.current = false;
      return;
    }

    if (isResettingRef.current) {
      return;
    }

    setPreviewItems(
      submitResult.value.items.map((item) =>
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
  }, [submitResult]);

  const clearImport = () => {
    isResettingRef.current = true;
    resetPreview();
    setPreviewItems([]);
    setActiveStep(1);
  };

  return (
    <accountPreviewForm.Initialize
      defaultValues={DEFAULT_ACCOUNT_PREVIEW_VALUES}
    >
      <ImportPanel
        activeStep={activeStep}
        confirmingId={confirmingId}
        isConfirming={confirmingId !== null}
        isPreviewPending={submitResult.waiting}
        onClear={clearImport}
        onConfirm={(item, payload) => {
          setConfirmingId(item.pendingImportId);
          return confirmImport(payload).finally(() => setConfirmingId(null));
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
        onSubmitPreview={() => submitPreview(() => previewImports)}
        previewItems={previewItems}
        submitResult={submitResult}
      />
    </accountPreviewForm.Initialize>
  );
};
