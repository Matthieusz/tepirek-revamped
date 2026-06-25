import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: "../../apps/server/.env",
});

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`${key} is required`);
  }
  return value;
};

export default defineConfig({
  dbCredentials: {
    url: requireEnv("DATABASE_URL"),
  },
  dialect: "postgresql",
  out: "./src/migrations",
  schema: "./src/schema",
});
