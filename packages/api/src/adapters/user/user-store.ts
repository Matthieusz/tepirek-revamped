/* eslint-disable no-shadow -- Named Effect generators mirror service names for traces. */
import type { EffectPgDatabase } from "@tepirek-revamped/db/effect";
import { EffectDatabase } from "@tepirek-revamped/db/effect";
import { account, user } from "@tepirek-revamped/db/schema/auth";
import type { SQL } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import {
  UserBadRequest,
  UserForbidden,
  UserNotFound,
} from "../../protocol/user/http-api-contract.js";
import { UserAdapterError } from "./user-adapter-error.js";

const LAST_ADMIN_MESSAGE =
  "Nie można odebrać uprawnień ostatniemu administratorowi";

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

export interface VerifiedMember {
  readonly id: string;
  readonly image: string | null;
  readonly name: string;
}

export interface Player {
  readonly createdAt: Date;
  readonly id: string;
  readonly image: string | null;
  readonly name: string;
  readonly role: string | null;
  readonly updatedAt: Date;
  readonly verified: boolean;
}

type UserRow = typeof user.$inferSelect;
type UserQueryExecutor = Pick<EffectPgDatabase, "select" | "update">;
type UserMutationState = Partial<Pick<UserRow, "role" | "verified">>;

export interface SetUserRoleInput {
  readonly actorId: string;
  readonly role: NonNullable<UserRow["role"]>;
  readonly updatedAt: Date;
  readonly userId: string;
}

export interface SetUserVerifiedInput {
  readonly actorId: string;
  readonly updatedAt: Date;
  readonly userId: string;
  readonly verified: boolean;
}

export interface UpdateUserNameInput {
  readonly name: string;
  readonly updatedAt: Date;
  readonly userId: string;
}

const persistenceQuery = <A>(
  operation: string,
  self: Effect.Effect<A, unknown, unknown>
): Effect.Effect<A, UserAdapterError> =>
  (self as Effect.Effect<A, unknown, never>).pipe(
    Effect.mapError((cause) => new UserAdapterError({ cause, operation }))
  );

const loadTargetUser = (
  database: Pick<UserQueryExecutor, "select">,
  userId: string
) =>
  Effect.gen(function* loadTargetUserEffect() {
    const rows = yield* persistenceQuery(
      "loadTargetUser",
      database.select().from(user).where(eq(user.id, userId))
    );
    const [targetUser] = rows;

    if (targetUser === undefined) {
      return yield* new UserNotFound({ message: "Użytkownik nie istnieje" });
    }

    return targetUser;
  });

const countVerifiedAdmins = (database: Pick<UserQueryExecutor, "select">) =>
  Effect.gen(function* countVerifiedAdminsEffect() {
    const rows = yield* persistenceQuery(
      "countVerifiedAdmins",
      database
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(and(eq(user.role, "admin"), eq(user.verified, true)))
    );

    return Number(rows[0]?.count ?? 0);
  });

const assertAdminMutationAllowed = (
  database: Pick<UserQueryExecutor, "select">,
  input: {
    readonly actorId: string;
    readonly next: UserMutationState;
    readonly targetUser: Pick<UserRow, "id" | "role" | "verified">;
  }
) =>
  Effect.gen(function* assertAdminMutationAllowedEffect() {
    const { actorId, next, targetUser } = input;
    const nextRole = next.role ?? targetUser.role;
    const nextVerified = next.verified ?? targetUser.verified;
    const willBeVerifiedAdmin = nextRole === "admin" && nextVerified === true;
    const isCurrentlyVerifiedAdmin =
      targetUser.role === "admin" && targetUser.verified === true;

    if (!isCurrentlyVerifiedAdmin || willBeVerifiedAdmin) {
      return;
    }

    if (targetUser.id === actorId) {
      return yield* new UserForbidden({ message: LAST_ADMIN_MESSAGE });
    }

    const verifiedAdminCount = yield* countVerifiedAdmins(database);

    if (verifiedAdminCount <= 1) {
      return yield* new UserForbidden({ message: LAST_ADMIN_MESSAGE });
    }
  });

const updateAndReturnUser = (
  database: UserQueryExecutor,
  operation: string,
  where: SQL,
  updatedAt: Date,
  values: Partial<typeof user.$inferInsert>
) =>
  Effect.gen(function* updateAndReturnUserEffect() {
    yield* persistenceQuery(
      operation,
      database
        .update(user)
        .set({ updatedAt, ...values })
        .where(where)
    );
    const rows = yield* persistenceQuery(
      operation,
      database.select(playerListSelect).from(user).where(where)
    );

    return rows[0] ?? null;
  });

const mutateAdminAvailabilityUser = (
  database: EffectPgDatabase,
  input: {
    readonly actorId: string;
    readonly next: UserMutationState;
    readonly updatedAt: Date;
    readonly userId: string;
  }
) =>
  Effect.gen(function* mutateAdminAvailabilityUserEffect() {
    const transaction = database.transaction((tx) =>
      Effect.gen(function* mutateAdminAvailabilityUserTransaction() {
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

    return yield* persistenceQuery("mutateAdminAvailabilityUser", transaction);
  });

const deleteUserWithDatabase =
  (database: EffectPgDatabase) =>
  (
    userId: string
  ): Effect.Effect<
    { readonly success: true },
    UserBadRequest | UserNotFound | UserAdapterError
  > =>
    Effect.gen(function* deleteUserEffect() {
      const targetUser = yield* loadTargetUser(database, userId);

      if (targetUser.verified) {
        return yield* new UserBadRequest({
          message: "Nie można usunąć zweryfikowanego użytkownika",
        });
      }

      yield* persistenceQuery(
        "deleteUser",
        database.delete(user).where(eq(user.id, userId))
      );

      return { success: true as const };
    });

const getVerifiedWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery(
    "getVerified",
    database
      .select(verifiedMemberSelect)
      .from(user)
      .where(eq(user.verified, true))
  );

const listWithDatabase = (database: EffectPgDatabase) => () =>
  persistenceQuery("listUsers", database.select(playerListSelect).from(user));

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

const getDiscordAccessTokenWithDatabase =
  (database: EffectPgDatabase) =>
  (userId: string): Effect.Effect<string, UserBadRequest | UserAdapterError> =>
    Effect.gen(function* getDiscordAccessTokenEffect() {
      const rows = yield* persistenceQuery(
        "getDiscordAccessToken",
        database
          .select({ accessToken: account.accessToken })
          .from(account)
          .where(
            and(eq(account.userId, userId), eq(account.providerId, "discord"))
          )
      );
      const accessToken = rows[0]?.accessToken;

      if (!accessToken) {
        return yield* new UserBadRequest({
          message: "Połącz konto Discord, aby zweryfikować członkostwo",
        });
      }

      return accessToken;
    });

const markUserVerifiedWithDatabase =
  (database: EffectPgDatabase) =>
  (input: {
    readonly updatedAt: Date;
    readonly userId: string;
  }): Effect.Effect<void, UserAdapterError> =>
    persistenceQuery(
      "markUserVerified",
      database
        .update(user)
        .set({ updatedAt: input.updatedAt, verified: true })
        .where(eq(user.id, input.userId))
    ).pipe(Effect.asVoid);

export class UserStore extends Context.Service<
  UserStore,
  {
    readonly deleteUser: (
      userId: string
    ) => Effect.Effect<
      { readonly success: true },
      UserBadRequest | UserNotFound | UserAdapterError
    >;
    readonly getDiscordAccessToken: (
      userId: string
    ) => Effect.Effect<string, UserBadRequest | UserAdapterError>;
    readonly getVerified: () => Effect.Effect<
      readonly VerifiedMember[],
      UserAdapterError
    >;
    readonly list: () => Effect.Effect<readonly Player[], UserAdapterError>;
    readonly markUserVerified: (input: {
      readonly updatedAt: Date;
      readonly userId: string;
    }) => Effect.Effect<void, UserAdapterError>;
    readonly setRole: (
      input: SetUserRoleInput
    ) => Effect.Effect<
      Player | null,
      UserForbidden | UserNotFound | UserAdapterError
    >;
    readonly setVerified: (
      input: SetUserVerifiedInput
    ) => Effect.Effect<
      Player | null,
      UserForbidden | UserNotFound | UserAdapterError
    >;
    readonly updateProfile: (
      input: UpdateUserNameInput
    ) => Effect.Effect<Player | null, UserAdapterError>;
  }
>()("@tepirek-revamped/api/UserStore") {}

export const UserStoreLayer: Layer.Layer<UserStore, never, EffectDatabase> =
  Layer.effect(
    UserStore,
    EffectDatabase.useSync((database) =>
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
