/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
// oxlint-disable promise/prefer-await-to-callbacks -- Effect combinators use callbacks for typed error mapping.
import type {
  EffectPgDatabase,
  TransactionDatabase,
} from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { account, user } from "@tepirek-revamped/db/schema/auth";
import type { SQL } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { AppUserId } from "../../domain/squad-builder/app-user-id.ts";
import {
  ApplicationDependencyUnavailable,
  ApplicationForbidden,
  ApplicationInvalidInput,
  ApplicationNotFound,
} from "../../services/application-errors.ts";
import { UserStore } from "../../services/user/user-store.ts";
import type {
  SetUserRoleInput,
  SetUserVerifiedInput,
  UpdateUserNameInput,
} from "../../services/user/user-store.ts";
import {
  decodePersistedValue,
  makeDirectPersistenceQuery,
} from "../persistence-query.ts";

const LAST_ADMIN_MESSAGE =
  "Nie można odebrać uprawnień ostatniemu administratorowi";
const PersistedCount = Schema.Union([Schema.Finite, Schema.FiniteFromString]);

const verifiedMemberSelect = {
  id: user.id,
  image: user.image,
  name: user.name,
};

const playerListSelect = {
  createdAt: user.createdAt,
  id: user.id,
  image: user.image,
  name: user.name,
  role: user.role,
  updatedAt: user.updatedAt,
  verified: user.verified,
};

const userPersistenceQuery = makeDirectPersistenceQuery(
  (input) => new ApplicationDependencyUnavailable(input)
);

const decodeAppUserId = (operation: string) =>
  decodePersistedValue(
    AppUserId,
    operation,
    (error) => new ApplicationDependencyUnavailable(error)
  );

const toVerifiedMember = Effect.fnUntraced(function* toVerifiedMember(row: {
  readonly id: string;
  readonly image: string | null;
  readonly name: string;
}) {
  const id = yield* decodeAppUserId("getVerified.decode")(row.id);
  return { ...row, id };
});

const toPlayer = Effect.fnUntraced(function* toPlayer(row: {
  readonly createdAt: Date;
  readonly id: string;
  readonly image: string | null;
  readonly name: string;
  readonly role: string | null;
  readonly updatedAt: Date;
  readonly verified: boolean;
}) {
  const id = yield* decodeAppUserId("listUsers.decode")(row.id);
  return { ...row, id };
});

type UserRow = typeof user.$inferSelect;
type UserQueryExecutor = Pick<EffectPgDatabase, "select" | "update">;
type UserMutationState = Partial<Pick<UserRow, "role" | "verified">>;

const loadTargetUser = Effect.fnUntraced(function* loadTargetUser(
  database: Pick<UserQueryExecutor, "select">,
  userId: AppUserId
) {
  const rows = yield* userPersistenceQuery(
    "loadTargetUser",
    database.select().from(user).where(eq(user.id, userId))
  );
  const [targetUser] = rows;

  if (targetUser === undefined) {
    return yield* new ApplicationNotFound({
      message: "Użytkownik nie istnieje",
    });
  }

  return targetUser;
});

const countVerifiedAdmins = Effect.fnUntraced(function* countVerifiedAdmins(
  database: Pick<UserQueryExecutor, "select">
) {
  const rows = yield* userPersistenceQuery(
    "countVerifiedAdmins",
    database
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(and(eq(user.role, "admin"), eq(user.verified, true)))
  );

  return yield* decodePersistedValue(
    PersistedCount,
    "countVerifiedAdmins.decode",
    (error) => new ApplicationDependencyUnavailable(error)
  )(rows[0]?.count ?? 0);
});

const assertAdminMutationAllowed = Effect.fnUntraced(
  function* assertAdminMutationAllowed(
    database: Pick<UserQueryExecutor, "select">,
    input: {
      readonly actorId: AppUserId;
      readonly next: UserMutationState;
      readonly targetUser: Pick<UserRow, "id" | "role" | "verified">;
    }
  ) {
    const { actorId, next, targetUser } = input;
    const nextRole = next.role ?? targetUser.role;
    const nextVerified = next.verified ?? targetUser.verified;
    const willBeVerifiedAdmin = nextRole === "admin" && nextVerified;
    const isCurrentlyVerifiedAdmin =
      targetUser.role === "admin" && targetUser.verified;

    if (!isCurrentlyVerifiedAdmin || willBeVerifiedAdmin) {
      return yield* Effect.void;
    }

    if (targetUser.id === actorId) {
      return yield* new ApplicationForbidden({ message: LAST_ADMIN_MESSAGE });
    }

    const verifiedAdminCount = yield* countVerifiedAdmins(database);

    if (verifiedAdminCount <= 1) {
      return yield* new ApplicationForbidden({ message: LAST_ADMIN_MESSAGE });
    }

    return yield* Effect.void;
  }
);

const updateAndReturnUser = Effect.fnUntraced(function* updateAndReturnUser(
  database: UserQueryExecutor,
  operation: string,
  where: SQL,
  updatedAt: Date,
  values: Partial<typeof user.$inferInsert>
) {
  yield* userPersistenceQuery(
    operation,
    database
      .update(user)
      .set({ updatedAt, ...values })
      .where(where)
  );
  const rows = yield* userPersistenceQuery(
    operation,
    database.select(playerListSelect).from(user).where(where)
  );

  const [row] = rows;
  return row === undefined ? null : yield* toPlayer(row);
});

const mutateAdminAvailabilityUser = Effect.fnUntraced(
  function* mutateAdminAvailabilityUser(
    database: EffectPgDatabase,
    input: {
      readonly actorId: AppUserId;
      readonly next: UserMutationState;
      readonly updatedAt: Date;
      readonly userId: AppUserId;
    }
  ) {
    const transaction = database.transaction(
      Effect.fnUntraced(function* mutateAdminAvailabilityUserTransaction(
        tx: TransactionDatabase
      ) {
        yield* tx.execute(
          sql`select pg_advisory_xact_lock(hashtext('tepirek:user-admin-mutation'))`
        );
        const targetUser = yield* loadTargetUser(tx, input.userId);
        yield* assertAdminMutationAllowed(tx, {
          actorId: input.actorId,
          next: input.next,
          targetUser,
        });

        return yield* updateAndReturnUser(
          tx,
          "mutateAdminAvailabilityUser",
          eq(user.id, input.userId),
          input.updatedAt,
          input.next
        );
      })
    );

    return yield* userPersistenceQuery(
      "mutateAdminAvailabilityUser",
      transaction
    );
  }
);

const deleteUserWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* deleteUser(userId: AppUserId) {
    const targetUser = yield* loadTargetUser(database, userId);

    if (targetUser.verified) {
      return yield* new ApplicationInvalidInput({
        message: "Nie można usunąć zweryfikowanego użytkownika",
      });
    }

    yield* userPersistenceQuery(
      "deleteUser",
      database.delete(user).where(eq(user.id, userId))
    );

    return { success: true as const };
  });

const getVerifiedWithDatabase = (database: EffectPgDatabase) => () =>
  userPersistenceQuery(
    "getVerified",
    database
      .select(verifiedMemberSelect)
      .from(user)
      .where(eq(user.verified, true))
  ).pipe(Effect.flatMap((rows) => Effect.all(rows.map(toVerifiedMember))));

const listWithDatabase = (database: EffectPgDatabase) => () =>
  userPersistenceQuery(
    "listUsers",
    database.select(playerListSelect).from(user)
  ).pipe(Effect.flatMap((rows) => Effect.all(rows.map(toPlayer))));

const setRoleWithDatabase =
  (database: EffectPgDatabase) =>
  ({ actorId, role, updatedAt, userId }: SetUserRoleInput) =>
    mutateAdminAvailabilityUser(database, {
      actorId,
      next: { role },
      updatedAt,
      userId,
    });

const setVerifiedWithDatabase =
  (database: EffectPgDatabase) =>
  ({ actorId, updatedAt, userId, verified }: SetUserVerifiedInput) =>
    mutateAdminAvailabilityUser(database, {
      actorId,
      next: { verified },
      updatedAt,
      userId,
    });

const updateProfileWithDatabase =
  (database: EffectPgDatabase) =>
  ({ name, updatedAt, userId }: UpdateUserNameInput) =>
    updateAndReturnUser(
      database,
      "updateProfile",
      eq(user.id, userId),
      updatedAt,
      { name }
    );

const getDiscordAccessTokenWithDatabase = (database: EffectPgDatabase) =>
  Effect.fnUntraced(function* getDiscordAccessToken(userId: AppUserId) {
    const rows = yield* userPersistenceQuery(
      "getDiscordAccessToken",
      database
        .select({ accessToken: account.accessToken })
        .from(account)
        .where(
          and(eq(account.userId, userId), eq(account.providerId, "discord"))
        )
    );
    const accessToken = rows[0]?.accessToken;

    if (
      accessToken === undefined ||
      accessToken === null ||
      accessToken.length === 0
    ) {
      return yield* new ApplicationInvalidInput({
        message: "Połącz konto Discord, aby zweryfikować członkostwo",
      });
    }

    return Redacted.make(accessToken);
  });

const markUserVerifiedWithDatabase =
  (database: EffectPgDatabase) =>
  (input: {
    readonly updatedAt: Date;
    readonly userId: AppUserId;
  }): Effect.Effect<void, ApplicationDependencyUnavailable> =>
    userPersistenceQuery(
      "markUserVerified",
      database
        .update(user)
        .set({ updatedAt: input.updatedAt, verified: true })
        .where(eq(user.id, input.userId))
    ).pipe(Effect.asVoid);

const getDatabaseSync = EffectDatabase.useSync.bind(EffectDatabase);

export const UserStoreLayer: Layer.Layer<UserStore, never, EffectDatabase> =
  Layer.effect(
    UserStore,
    getDatabaseSync((database) =>
      UserStore.of({
        deleteUser: Effect.fn("UserStore.deleteUser")(
          deleteUserWithDatabase(database)
        ),
        getDiscordAccessToken: Effect.fn("UserStore.getDiscordAccessToken")(
          getDiscordAccessTokenWithDatabase(database)
        ),
        getVerified: Effect.fn("UserStore.getVerified")(
          getVerifiedWithDatabase(database)
        ),
        list: Effect.fn("UserStore.list")(listWithDatabase(database)),
        markUserVerified: Effect.fn("UserStore.markUserVerified")(
          markUserVerifiedWithDatabase(database)
        ),
        setRole: Effect.fn("UserStore.setRole")(setRoleWithDatabase(database)),
        setVerified: Effect.fn("UserStore.setVerified")(
          setVerifiedWithDatabase(database)
        ),
        updateProfile: Effect.fn("UserStore.updateProfile")(
          updateProfileWithDatabase(database)
        ),
      })
    )
  );
