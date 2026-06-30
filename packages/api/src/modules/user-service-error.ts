/** All expected failures for user service operations. */
export type UserServiceError =
  | { readonly _tag: "UserNotFound"; readonly message: string }
  | { readonly _tag: "CannotDeleteVerifiedUser"; readonly message: string }
  | { readonly _tag: "MissingDiscordConfig"; readonly message: string }
  | { readonly _tag: "MissingDiscordAccount"; readonly message: string }
  | { readonly _tag: "DiscordApiFailure"; readonly message: string }
  | { readonly _tag: "DiscordApiTimeout"; readonly message: string }
  | { readonly _tag: "AdminSelfMutationForbidden"; readonly message: string }
  | { readonly _tag: "LastAdminCannotBeDemoted"; readonly message: string };
