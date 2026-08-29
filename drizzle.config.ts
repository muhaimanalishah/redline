import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL?.trim();
const isPostgres = Boolean(
  databaseUrl &&
    (databaseUrl.startsWith("postgres://") ||
      databaseUrl.startsWith("postgresql://"))
);

export default defineConfig(
  isPostgres
    ? {
        schema: "./db/schema.pg.ts",
        out: "./drizzle/pg",
        dialect: "postgresql",
        dbCredentials: {
          url: databaseUrl!,
        },
      }
    : {
        schema: "./db/schema.sqlite.ts",
        out: "./drizzle/sqlite",
        dialect: "sqlite",
        dbCredentials: {
          url: "./db/local.db",
        },
      }
);