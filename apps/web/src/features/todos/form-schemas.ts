import { CreateTodoPayload } from "@tepirek-revamped/api/protocol/todo/http-api-contract";
import * as Schema from "effect/Schema";

export const TodoTextSchema = CreateTodoPayload.fields.text.pipe(
  Schema.refine((value): value is string => value.trim().length > 0, {
    message: "Podaj treść zadania",
  })
);
