import { EffectDatabase } from "@tepirek-revamped/db/effect";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { squadGroup } from "@tepirek-revamped/db/schema/squad-builder";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { appUserIdToString } from "../app-user-id";
import { squadGroupNameToString } from "../squad-name";
import { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  CreateSquadGroupStoreInput,
  SquadGroupSummary,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

const createSquadGroupWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
    name,
  }: CreateSquadGroupStoreInput): Effect.Effect<
    SquadGroupSummary,
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* createSquadGroupEffect() {
      const insert = database
        .insert(squadGroup)
        .values({
          name: squadGroupNameToString(name),
          ownerUserId: appUserIdToString(actorUserId),
          visibility: "private",
        })
        .returning({
          id: squadGroup.id,
          updatedAt: squadGroup.updatedAt,
        });
      // SAFETY: Drizzle's Effect PostgreSQL insert builder is an Effect whose
      // runtime value is the returned row array. The cast narrows the generated
      // query effect so this adapter can translate its typed query failure into
      // the local persistence error below.
      const insertEffect = insert as Effect.Effect<
        readonly { readonly id: number; readonly updatedAt: Date }[],
        unknown,
        never
      >;
      const createdRows = yield* insertEffect.pipe(
        Effect.catch((error) =>
          Effect.fail(
            new EffectSquadBuilderPersistenceUnavailable({
              cause: error,
              operation: "createSquadGroup",
              provider: "postgres",
            })
          )
        )
      );

      const [created] = createdRows;

      if (created === undefined) {
        return yield* Effect.fail(
          new EffectSquadBuilderPersistenceUnavailable({
            cause: new Error("Failed to insert squad group"),
            operation: "createSquadGroup",
            provider: "postgres",
          })
        );
      }

      return {
        characterCount: 0,
        groupId: created.id as never,
        name,
        squadCount: 0,
        updatedAt: created.updatedAt,
      };
    });

export const DrizzleEffectSquadGroupStoreLayer: Layer.Layer<
  EffectSquadGroupStore,
  never,
  EffectDatabase
> = Layer.effect(
  EffectSquadGroupStore,
  EffectDatabase.useSync((database) =>
    EffectSquadGroupStore.of({
      createSquadGroup: createSquadGroupWithDatabase(database),
    })
  )
);
