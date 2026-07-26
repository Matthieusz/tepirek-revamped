import {
  ConfirmOwnedAccountImportPayload,
  PreviewOwnedAccountImportsPayload,
} from "@tepirek-revamped/api/protocol/squad-builder/account-import/account-import-schema";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as Str from "effect/String";

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
