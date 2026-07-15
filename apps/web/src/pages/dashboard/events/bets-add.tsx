import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { FormBuilder, FormReact } from "@lucas-barake/effect-form-react";
import { useHotkey } from "@tanstack/react-hotkeys";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { HeroBetMemberPicker } from "@/components/events/hero-bet-member-picker";
import { HeroCardsGrid } from "@/components/events/hero-cards-grid";
import type { HeroCardOption } from "@/components/events/hero-cards-grid";
import type { SelectableUser } from "@/components/events/user-select-list";
import {
  EffectForm,
  EffectFormFeedback,
  useEffectFormProtection,
} from "@/components/forms/effect-form";
import {
  EffectFieldError,
  getFieldErrorId,
  getFieldId,
} from "@/components/forms/effect-form-field-helpers";
import { EffectFieldFrame } from "@/components/forms/effect-form-fields";
import { AsyncResultBoundary } from "@/components/ui/async-result-boundary";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBetAtom, latestBetForCopyAtom } from "@/lib/bet-atoms";
import { getEventIcon } from "@/lib/constants";
import { eventsAtom } from "@/lib/event-atoms";
import { NonEmptyUserIdsSchema } from "@/lib/form-schemas";
import { formSubmission } from "@/lib/form-submission";
import { heroesAtom } from "@/lib/hero-atoms";
import { isAdmin } from "@/lib/route-helpers";
import { verifiedUsersAtom } from "@/lib/user-atoms";
import type { AuthSession } from "@/types/route";

interface EventOption {
  readonly color: string;
  readonly endTime: Date;
  readonly icon: string;
  readonly id: number;
  readonly name: string;
}

interface EventFieldProps {
  readonly events: EventOption[] | undefined;
  readonly eventsLoading: boolean;
  readonly onEventChange: (eventId: string) => void;
}

const EventField: FormReact.FieldComponent<string, EventFieldProps> = ({
  field,
  props,
}) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);
  const selectedEvent = props.events?.find(
    (event) => event.id.toString() === field.value
  );
  const SelectedIcon = selectedEvent ? getEventIcon(selectedEvent.icon) : null;

  return (
    <EffectFieldFrame error={field.error} fieldId={fieldId} label="Event">
      <Select
        name={field.path}
        onValueChange={(value) => {
          if (value !== null) {
            field.onChange(value);
            props.onEventChange(value);
          }
        }}
        value={field.value}
      >
        <SelectTrigger
          aria-describedby={hasError ? errorId : undefined}
          aria-invalid={hasError}
          id={fieldId}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder="Wybierz event">
            {selectedEvent && SelectedIcon && (
              <span className="flex items-center gap-2">
                <SelectedIcon
                  className="size-4"
                  style={{ color: selectedEvent.color }}
                />
                {selectedEvent.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {props.eventsLoading ? (
            <SelectItem disabled value="loading">
              Ładowanie...
            </SelectItem>
          ) : (
            props.events?.map((event) => {
              const IconComponent = getEventIcon(event.icon);
              return (
                <SelectItem key={event.id} value={event.id.toString()}>
                  <span className="flex items-center gap-2">
                    <IconComponent
                      className="size-4"
                      style={{ color: event.color }}
                    />
                    {event.name}
                  </span>
                </SelectItem>
              );
            })
          )}
        </SelectContent>
      </Select>
    </EffectFieldFrame>
  );
};

interface HeroFieldProps {
  readonly heroes:
    | readonly (HeroCardOption & { eventId: number })[]
    | undefined;
  readonly heroesLoading: boolean;
  readonly selectedEventId: string;
}

const HeroField: FormReact.FieldComponent<string, HeroFieldProps> = ({
  field,
  props,
}) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);
  let content: React.ReactNode;
  if (props.heroesLoading) {
    content = <p className="text-muted-foreground text-sm">Ładowanie...</p>;
  } else if (props.selectedEventId === "") {
    content = (
      <p className="text-muted-foreground text-sm">Najpierw wybierz event</p>
    );
  } else {
    const filteredHeroes = props.heroes?.filter(
      (hero) => hero.eventId === Number.parseInt(props.selectedEventId, 10)
    );
    content =
      filteredHeroes?.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Brak herosów w tym evencie
        </p>
      ) : (
        <HeroCardsGrid
          fieldName={field.path}
          heroes={filteredHeroes ?? []}
          onBlur={field.onBlur}
          onSelectHero={field.onChange}
          selectedHeroId={field.value}
        />
      );
  }

  return (
    <fieldset
      aria-describedby={hasError ? errorId : undefined}
      aria-invalid={hasError}
      aria-labelledby={`${fieldId}-label`}
      className="grid gap-2"
      id={fieldId}
    >
      <legend className="text-sm font-medium" id={`${fieldId}-label`}>
        Heros
      </legend>
      {content}
      <EffectFieldError error={field.error} id={errorId} />
    </fieldset>
  );
};

interface MembersFieldProps {
  readonly lastBet: { members: { userId: string }[] } | undefined;
  readonly lastBetAvailable: boolean;
  readonly users: SelectableUser[] | undefined;
  readonly usersLoading: boolean;
}

const MembersField: FormReact.FieldComponent<
  readonly string[],
  MembersFieldProps
> = ({ field, props }) => {
  const fieldId = getFieldId(field.path);
  const errorId = getFieldErrorId(fieldId);
  const hasError = Option.isSome(field.error);

  return (
    <fieldset
      aria-describedby={hasError ? errorId : undefined}
      aria-invalid={hasError}
      aria-labelledby={`${fieldId}-label`}
      className="grid gap-2"
      id={fieldId}
    >
      <legend className="sr-only" id={`${fieldId}-label`}>
        Gracze
      </legend>
      <HeroBetMemberPicker
        clearEnabled
        copyLastBetEnabled
        fieldName={field.path}
        idPrefix={fieldId}
        lastBet={props.lastBet}
        lastBetAvailable={props.lastBetAvailable}
        onBlur={field.onBlur}
        onChange={field.onChange}
        selectedUserIds={[...field.value]}
        users={props.users}
        usersLoading={props.usersLoading}
        variant="add"
      />
      <EffectFieldError error={field.error} id={errorId} />
    </fieldset>
  );
};

const addBetFormBuilder = FormBuilder.empty
  .addField(
    "eventId",
    Schema.String.pipe(
      Schema.refine((value): value is string => value.length > 0, {
        message: "Wybierz event",
      })
    )
  )
  .addField(
    "heroId",
    Schema.String.pipe(
      Schema.refine((value): value is string => value.length > 0, {
        message: "Wybierz herosa",
      })
    )
  )
  .addField("userIds", NonEmptyUserIdsSchema);

const defaultValues = { eventId: "", heroId: "", userIds: [] };

interface BetSubmission {
  readonly heroId: number;
  readonly userIds: readonly [string, ...string[]];
}

type CreateBet = (submission: BetSubmission) => Promise<unknown>;

const addBetForm = FormReact.make(addBetFormBuilder, {
  fields: {
    eventId: EventField,
    heroId: HeroField,
    userIds: MembersField,
  },
  mode: { validation: "onSubmit" },
  onSubmit: (createBet: CreateBet, { decoded }) =>
    formSubmission(() =>
      createBet({
        heroId: Number.parseInt(decoded.heroId, 10),
        userIds: decoded.userIds,
      })
    ),
});

interface BetsAddPageProps {
  session: AuthSession;
}

// oxlint-disable-next-line complexity
export const BetsAddPage = ({ session }: BetsAddPageProps) => {
  const createBet = useAtomSet(createBetAtom, { mode: "promise" });
  const isAdminUser = isAdmin(session);

  const eventsResult = useAtomValue(eventsAtom);
  const events =
    isAdminUser && AsyncResult.isSuccess(eventsResult)
      ? [...eventsResult.value]
      : undefined;
  const eventsLoading = isAdminUser && !AsyncResult.isSuccess(eventsResult);

  const heroesResult = useAtomValue(heroesAtom);
  const heroes =
    isAdminUser && AsyncResult.isSuccess(heroesResult)
      ? heroesResult.value
      : undefined;
  const heroesLoading = isAdminUser && !AsyncResult.isSuccess(heroesResult);

  const verifiedUsersResult = useAtomValue(verifiedUsersAtom);
  const verifiedUsers =
    isAdminUser && AsyncResult.isSuccess(verifiedUsersResult)
      ? [...verifiedUsersResult.value]
      : undefined;
  const usersLoading =
    isAdminUser && !AsyncResult.isSuccess(verifiedUsersResult);

  const latestBetResult = useAtomValue(latestBetForCopyAtom);
  const latestBetRaw = isAdminUser
    ? Option.getOrNull(AsyncResult.value(latestBetResult))
    : null;
  const latestBet =
    latestBetRaw === null
      ? null
      : { ...latestBetRaw, members: [...latestBetRaw.members] };
  const refreshEvents = useAtomRefresh(eventsAtom);
  const refreshHeroes = useAtomRefresh(heroesAtom);
  const refreshUsers = useAtomRefresh(verifiedUsersAtom);
  const submit = useAtomSet(addBetForm.submit);
  const submitResult = useAtomValue(addBetForm.submit);
  const isDirty = useAtomValue(addBetForm.isDirty);
  useEffectFormProtection(isDirty, submitResult.waiting);
  const clearHero = useAtomSet(
    addBetForm.getFieldAtoms(addBetForm.fields.heroId).setValue
  );
  const clearUsers = useAtomSet(
    addBetForm.getFieldAtoms(addBetForm.fields.userIds).setValue
  );
  const formValues = useAtomValue(addBetForm.values);
  const selectedEventId = Option.match(formValues, {
    onNone: () => "",
    onSome: (values) => values.eventId,
  });

  useEffect(() => {
    if (AsyncResult.isSuccess(submitResult)) {
      toast.success("Obstawienie dodano pomyślnie");
      clearUsers([]);
    }
  }, [clearUsers, submitResult]);

  const submitIfIdle = () => {
    if (!submitResult.waiting) {
      submit(() => createBet);
    }
  };

  useHotkey("Enter", submitIfIdle, {
    meta: {
      description: "Submit the bet creation form",
      name: "Create Bet",
    },
  });

  if (!isAdminUser) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <div>
          <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
            Dodaj obstawienie
          </h1>
          <p className="text-muted-foreground text-sm">
            Tylko administratorzy mogą dodawać obstawienia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AsyncResultBoundary onRetry={refreshEvents} result={eventsResult}>
      {() => (
        <AsyncResultBoundary onRetry={refreshHeroes} result={heroesResult}>
          {() => (
            <AsyncResultBoundary
              onRetry={refreshUsers}
              result={verifiedUsersResult}
            >
              {() => (
                <div className="mx-auto w-full max-w-4xl space-y-6">
                  <div>
                    <h1 className="font-serif font-bold tracking-tight text-foreground text-2xl">
                      Dodaj obstawienie
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      Wybierz event, herosa i graczy.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-6">
                    <addBetForm.Initialize defaultValues={defaultValues}>
                      <EffectForm
                        action={submitIfIdle}
                        className="space-y-6"
                        submitResult={submitResult}
                      >
                        <EffectFormFeedback result={submitResult} />
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <addBetForm.eventId
                            events={events}
                            eventsLoading={eventsLoading}
                            onEventChange={() => {
                              clearHero("");
                            }}
                          />
                          <Button
                            className="h-10"
                            disabled={
                              submitResult.waiting ||
                              eventsLoading ||
                              heroesLoading ||
                              usersLoading
                            }
                            type="submit"
                          >
                            {submitResult.waiting ? (
                              <p className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Tworzenie obstawienia
                              </p>
                            ) : (
                              <p className="flex items-center gap-2">
                                Utwórz obstawienie
                                <Kbd>Enter</Kbd>
                              </p>
                            )}
                          </Button>
                        </div>
                        <addBetForm.heroId
                          heroes={heroes}
                          heroesLoading={heroesLoading}
                          selectedEventId={selectedEventId}
                        />
                        <addBetForm.userIds
                          lastBet={latestBet ?? undefined}
                          lastBetAvailable={
                            latestBet !== null && latestBet !== undefined
                          }
                          users={verifiedUsers}
                          usersLoading={usersLoading}
                        />
                      </EffectForm>
                    </addBetForm.Initialize>
                  </div>
                </div>
              )}
            </AsyncResultBoundary>
          )}
        </AsyncResultBoundary>
      )}
    </AsyncResultBoundary>
  );
};
