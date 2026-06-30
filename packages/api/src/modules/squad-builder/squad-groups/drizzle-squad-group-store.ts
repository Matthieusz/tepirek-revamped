import { EffectDatabase } from "@tepirek-revamped/db/effect";
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import {
  squad,
  squadCharacter,
  squadGroup,
} from "@tepirek-revamped/db/schema/squad-builder";
import { desc, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import { appUserIdToString } from "../app-user-id";
import { isError } from "../result";
import { parseSquadGroupId } from "../squad-group-id";
import { parseSquadGroupName, squadGroupNameToString } from "../squad-name";
import { EffectSquadBuilderPersistenceUnavailable } from "./squad-group-errors";
import type {
  CreateSquadGroupStoreInput,
  ListMySquadGroupsInput,
  SquadGroupSummary,
} from "./squad-group-store";
import { EffectSquadGroupStore } from "./squad-group-store";

type EffectSquadGroupPersistenceOperation =
  | "createSquadGroup"
  | "listMySquadGroups";

const failPersistence = (
  operation: EffectSquadGroupPersistenceOperation,
  cause: unknown
) =>
  Effect.fail(
    new EffectSquadBuilderPersistenceUnavailable({
      cause,
      operation,
      provider: "postgres",
    })
  );

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
        Effect.catch((error) => failPersistence("createSquadGroup", error))
      );

      const [created] = createdRows;

      if (created === undefined) {
        return yield* failPersistence(
          "createSquadGroup",
          new Error("Failed to insert squad group")
        );
      }

      const groupId = parseSquadGroupId(created.id);

      if (isError(groupId)) {
        return yield* failPersistence("createSquadGroup", groupId.error);
      }

      return {
        characterCount: 0,
        groupId: groupId.value,
        name,
        squadCount: 0,
        updatedAt: created.updatedAt,
      };
    });

const listMySquadGroupsWithDatabase =
  (database: EffectPgDatabase) =>
  ({
    actorUserId,
  }: ListMySquadGroupsInput): Effect.Effect<
    readonly SquadGroupSummary[],
    EffectSquadBuilderPersistenceUnavailable,
    never
  > =>
    Effect.gen(function* listMySquadGroupsEffect() {
      const select = database
        .select({
          characterCount: sql<number>`count(distinct ${squadCharacter.id})::int`,
          groupId: squadGroup.id,
          name: squadGroup.name,
          squadCount: sql<number>`count(distinct ${squad.id})::int`,
          updatedAt: squadGroup.updatedAt,
        })
        .from(squadGroup)
        .leftJoin(squad, eq(squad.squadGroupId, squadGroup.id))
        .leftJoin(squadCharacter, eq(squadCharacter.squadId, squad.id))
        .where(eq(squadGroup.ownerUserId, appUserIdToString(actorUserId)))
        .groupBy(squadGroup.id)
        .orderBy(desc(squadGroup.updatedAt), desc(squadGroup.id));
      // SAFETY: Drizzle's Effect PostgreSQL select builder is an Effect whose
      // runtime value is the selected row array. The cast narrows the generated
      // query effect so this adapter can translate its typed query failure into
      // the local persistence error below.
      const selectEffect = select as Effect.Effect<
        readonly {
          readonly characterCount: number | null;
          readonly groupId: number;
          readonly name: string;
          readonly squadCount: number | null;
          readonly updatedAt: Date;
        }[],
        unknown,
        never
      >;
      const rows = yield* selectEffect.pipe(
        Effect.catch((error) => failPersistence("listMySquadGroups", error))
      );

      const groups: SquadGroupSummary[] = [];

      for (const row of rows) {
        const groupId = parseSquadGroupId(row.groupId);

        if (isError(groupId)) {
          return yield* failPersistence("listMySquadGroups", groupId.error);
        }

        const name = parseSquadGroupName(row.name);

        if (isError(name)) {
          return yield* failPersistence("listMySquadGroups", name.error);
        }

        groups.push({
          characterCount: row.characterCount ?? 0,
          groupId: groupId.value,
          name: name.value,
          squadCount: row.squadCount ?? 0,
          updatedAt: row.updatedAt,
        });
      }

      return groups;
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
      listMySquadGroups: listMySquadGroupsWithDatabase(database),
    })
  )
);
