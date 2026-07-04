export type AppErrorCode =
  | "BAD_REQUEST"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED";

/** Application-level expected failure used by migrated Effect HttpApi handlers. */
export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, options?: { readonly message?: string }) {
    super(options?.message ?? code);
    this.name = "AppError";
    this.code = code;
  }
}
