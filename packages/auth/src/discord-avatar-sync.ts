import type { BetterAuthOptions } from "better-auth";

const BETTER_AUTH_CALLBACK_PATH = "/callback/:id";
const DISCORD_PROVIDER_ID = "discord";

type UserUpdateHook = NonNullable<
  NonNullable<
    NonNullable<
      NonNullable<BetterAuthOptions["databaseHooks"]>["user"]
    >["update"]
  >["before"]
>;
type UserUpdate = Parameters<UserUpdateHook>[0];
type UserUpdateContext = Pick<
  NonNullable<Parameters<UserUpdateHook>[1]>,
  "params" | "path"
>;
type UserUpdateResult = Extract<
  Awaited<ReturnType<UserUpdateHook>>,
  { data: object }
>;
type UserUpdateResultData = UserUpdateResult["data"];

/**
 * Keep Discord OAuth sign-in updates limited to the provider avatar.
 *
 * Better Auth merges a before-hook's returned data into the original update,
 * so omitted fields would otherwise still be persisted. Non-avatar fields are
 * explicitly masked with `undefined`; the database adapter ignores those
 * fields while retaining the avatar update.
 */
export const syncDiscordAvatar = (
  user: UserUpdate,
  context: UserUpdateContext | null
): ReturnType<UserUpdateHook> => {
  if (
    context?.path !== BETTER_AUTH_CALLBACK_PATH ||
    context.params?.id !== DISCORD_PROVIDER_ID ||
    user.image === undefined
  ) {
    return Promise.resolve();
  }

  const data: UserUpdateResultData = { image: user.image };
  for (const key of Object.keys(user)) {
    if (key !== "image") {
      data[key] = undefined;
    }
  }

  return Promise.resolve({ data });
};
