import {
  ConfirmOwnedAccountImportPayload,
  PreviewOwnedAccountImportsPayload,
} from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import { CreateSquadGroupPayload } from "@tepirek-revamped/api/protocol/squad-builder/squad-groups/squad-groups-schema";
import { CreateTodoPayload } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import {
  DEFAULT_EVENT_ICON_ID,
  EVENT_ICON_IDS,
} from "@tepirek-revamped/config";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Str from "effect/String";

import { parseLevels } from "@/lib/calculators/bounty";
import { parseGoldAmount } from "@/lib/gold";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

/** Shared email validation used by the login and signup forms. */
export const EmailSchema = Schema.String.pipe(
  Schema.refine((value): value is string => EMAIL_PATTERN.test(value), {
    message: "Nieprawidłowy adres e-mail",
  })
);

/** Shared password validation used by the login and signup forms. */
export const PasswordSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.length >= 8, {
    message: "Hasło musi mieć co najmniej 8 znaków",
  })
);

export const SignupNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.length >= 2, {
    message: "Nazwa musi mieć co najmniej 2 znaki",
  })
);

export const TodoTextSchema = CreateTodoPayload.fields.text.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj treść zadania",
  })
);

/** Accepts browser-friendly arrays while decoding only non-empty user selections. */
export const NonEmptyUserIdsSchema = Schema.Array(Schema.String).pipe(
  Schema.refine(
    (userIds): userIds is readonly [string, ...string[]] => userIds.length > 0,
    { message: "Wybierz co najmniej jednego gracza" }
  ),
  Schema.decodeTo(Schema.NonEmptyArray(Schema.String))
);

export const EventColors = [
  { id: "#22c55e", name: "Zielony" },
  { id: "#eab308", name: "Żółty" },
  { id: "#f97316", name: "Pomarańczowy" },
  { id: "#ef4444", name: "Czerwony" },
  { id: "#8b5cf6", name: "Fioletowy" },
  { id: "#6366f1", name: "Indygo" },
  { id: "#3b82f6", name: "Niebieski" },
  { id: "#06b6d4", name: "Cyjan" },
  { id: "#ec4899", name: "Różowy" },
] as const;

export type EventColor = (typeof EventColors)[number]["id"];

export const EventNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj nazwę eventu",
  })
);

export const EventIconSchema = Schema.Literals(EVENT_ICON_IDS);
export const EventColorSchema = Schema.Literals(
  EventColors.map((color) => color.id)
);
export const EventDateSchema = Schema.NullOr(Schema.Date).pipe(
  Schema.refine((value): value is Date => value !== null, {
    message: "Wybierz datę końcową eventu",
  })
);

export const EventFormDefaults = {
  color: "#6366f1" as const,
  date: null,
  icon: DEFAULT_EVENT_ICON_ID,
  name: "",
};

export const HeroNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj nazwę herosa",
  })
);

const PositiveIntegerIdFromString = Schema.FiniteFromString.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0))
);

export const HeroEventIdSchema = PositiveIntegerIdFromString.annotate({
  message: "Wybierz event",
});

export const SkillLinkSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj link do zestawu umiejętności",
  })
);

export const SkillNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj nazwę zestawu umiejętności",
  })
);

export const SkillProfessionIdSchema = PositiveIntegerIdFromString.annotate({
  message: "Wybierz profesję",
});

export const SkillMasterySchema = Schema.Boolean;

export const GoldAmountSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj kwotę złota",
  }),
  Schema.refine((value): value is string => parseGoldAmount(value) > 0, {
    message: "Podaj prawidłową kwotę złota",
  })
);

export const RequiredSelectionSchema = (message: string) =>
  PositiveIntegerIdFromString.annotate({ message });

export const MAX_PROFILE_URLS = 20;

export const getProfileLines = (value: string): readonly string[] =>
  Arr.filterMap<string, string, null>((line) => {
    const trimmedLine = Str.trim(line);
    return Str.isNonEmpty(trimmedLine)
      ? Result.succeed(trimmedLine)
      : Result.fail(null);
  })(Str.split(value, "\n"));

export const ProfileUrlsSchema = Schema.String.pipe(
  Schema.refine((value): value is string => getProfileLines(value).length > 0, {
    message: "Wklej co najmniej jeden link do profilu",
  }),
  Schema.refine(
    (value): value is string =>
      getProfileLines(value).length <= MAX_PROFILE_URLS,
    { message: `Wklej maksymalnie ${MAX_PROFILE_URLS} linków do profili` }
  ),
  Schema.decodeTo(PreviewOwnedAccountImportsPayload.fields.profileUrls, {
    decode: SchemaGetter.transform(getProfileLines),
    encode: SchemaGetter.transform((lines) => lines.join("\n")),
  })
);

export const AccountDisplayNameSchema =
  ConfirmOwnedAccountImportPayload.fields.displayName.pipe(
    Schema.refine((value): value is string => value.trim().length > 0, {
      message: "Podaj nazwę konta",
    }),
    Schema.refine((value): value is string => value.length <= 80, {
      message: "Nazwa konta może mieć maksymalnie 80 znaków",
    })
  );

const POSITIVE_INTEGER_TEXT = /^[1-9]\d*$/u;

export const validateSquadFilterLevelOrder = (values: {
  readonly maxLevel: string;
  readonly minLevel: string;
}): true | { readonly issue: string; readonly path: readonly ["maxLevel"] } => {
  const minLevel = values.minLevel.trim();
  const maxLevel = values.maxLevel.trim();
  const parsedMinLevel = Schema.decodeUnknownOption(
    PositiveIntegerIdFromString
  )(minLevel);
  const parsedMaxLevel = Schema.decodeUnknownOption(
    PositiveIntegerIdFromString
  )(maxLevel);

  if (
    Option.isSome(parsedMinLevel) &&
    Option.isSome(parsedMaxLevel) &&
    parsedMinLevel.value > parsedMaxLevel.value
  ) {
    return {
      issue: "Poziom od nie może być większy niż poziom do",
      path: ["maxLevel"],
    };
  }

  return true;
};

export const SquadFilterNameSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.length <= 80, {
    message: "Nazwa składu może mieć maksymalnie 80 znaków",
  }),
  Schema.refine((value): value is string => value.trim().length !== 1, {
    message: "Wpisz co najmniej 2 znaki nazwy składu",
  })
);

export const OptionalLevelSchema = Schema.String.pipe(
  Schema.refine(
    (value): value is string =>
      value.trim().length === 0 || POSITIVE_INTEGER_TEXT.test(value.trim()),
    { message: "Podaj poziom jako liczbę całkowitą większą od 0" }
  )
);

export const CreateSquadGroupNameSchema =
  CreateSquadGroupPayload.fields.name.pipe(
    Schema.refine((value): value is string => value.trim().length > 0, {
      message: "Podaj nazwę grupy składów",
    }),
    Schema.refine((value): value is string => value.length <= 80, {
      message: "Nazwa grupy może mieć maksymalnie 80 znaków",
    })
  );

export const CalculatorLevelSchema = Schema.Finite.check(
  Schema.isInt({ message: "Podaj liczbę całkowitą od 1 do 500" }),
  Schema.isBetween({
    maximum: 500,
    minimum: 1,
  })
).annotate({ message: "Podaj liczbę całkowitą od 1 do 500" });

export const CalculatorItemLevelSchema = Schema.Finite.check(
  Schema.isInt({ message: "Podaj liczbę całkowitą od 1 do 300" }),
  Schema.isBetween({
    maximum: 300,
    minimum: 1,
  })
).annotate({ message: "Podaj liczbę całkowitą od 1 do 300" });

export const CalculatorLevelsSchema = Schema.String.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Wprowadź poziomy",
  }),
  Schema.refine((value): value is string => parseLevels(value).length > 0, {
    message: "Wprowadź co najmniej jeden poprawny poziom",
  })
);
