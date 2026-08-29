import fs from "fs";
import path from "path";
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

function getSqlitePath(): string {
  // On Vercel / serverless environments, the filesystem is read-only except /tmp
  if (
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === "production"
  ) {
    return "/tmp/local.db";
  }
  return path.resolve(process.cwd(), "db", "local.db");
}

export function getSqliteDb(): BetterSQLite3Database<typeof sqliteSchema> {
  if (!global.__sqliteDb) {
    const dbPath = getSqlitePath();
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(dbPath);

    // Auto-create documents table if not exists (ensures fresh serverless instances work out of the box)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        is_archived INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

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