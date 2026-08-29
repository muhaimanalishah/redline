import Database from "better-sqlite3";
import { drizzle as drizzleSqlite, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import postgres from "postgres";
import { drizzle as drizzlePg, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as sqliteSchema from "./schema.sqlite";
import * as pgSchema from "./schema.pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
export const isPostgres = Boolean(
  databaseUrl &&
    (databaseUrl.startsWith("postgres://") ||
      databaseUrl.startsWith("postgresql://"))
);

export const dbType: "sqlite" | "postgres" = isPostgres ? "postgres" : "sqlite";

declare global {
  var __sqliteDb: BetterSQLite3Database<typeof sqliteSchema> | undefined;
  var __pgDb: PostgresJsDatabase<typeof pgSchema> | undefined;
}

export function getSqliteDb(): BetterSQLite3Database<typeof sqliteSchema> {
  if (!global.__sqliteDb) {
    const sqlite = new Database("./db/local.db");
    global.__sqliteDb = drizzleSqlite(sqlite, { schema: sqliteSchema });
  }
  return global.__sqliteDb;
}

export function getPgDb(): PostgresJsDatabase<typeof pgSchema> {
  if (!global.__pgDb) {
    const client = postgres(databaseUrl!);
    global.__pgDb = drizzlePg(client, { schema: pgSchema });
  }
  return global.__pgDb;
}