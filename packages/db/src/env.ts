/**
 * Synchronous env helper for Drizzle CLI and Better Auth's sync adapter
 * boundaries only.
 *
 * Effect-managed code should use `Config.redacted("DATABASE_URL")` via
 * `DatabaseUrlConfig` from `@tepirek-revamped/db/effect` instead.
 */
export const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`${key} is required`);
  }
  return value;
};
