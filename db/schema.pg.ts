import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default(""),
  content: text("content").notNull().default(""),
  isPinned: boolean("is_pinned").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PgDocument = typeof documents.$inferSelect;
export type PgNewDocument = typeof documents.$inferInsert;
