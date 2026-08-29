import { and, desc, eq, or, sql } from "drizzle-orm";
import { getSqliteDb, getPgDb, isPostgres } from "./index";
import { documents as sqliteDocs } from "./schema.sqlite";
import { documents as pgDocs } from "./schema.pg";
import { Document, NewDocument } from "./schema";

export async function searchDocuments(query: string): Promise<Document[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const lowerSearch = `%${cleanQuery.toLowerCase()}%`;

  if (isPostgres) {
    const db = getPgDb();
    return db
      .select()
      .from(pgDocs)
      .where(
        and(
          eq(pgDocs.isArchived, false),
          or(
            sql`LOWER(COALESCE(NULLIF(${pgDocs.title}, ''), 'untitled')) LIKE ${lowerSearch}`,
            sql`LOWER(${pgDocs.content}) LIKE ${lowerSearch}`
          )
        )
      )
      .orderBy(desc(pgDocs.isPinned), desc(pgDocs.updatedAt))
      .limit(30);
  }

  const db = getSqliteDb();
  return db
    .select()
    .from(sqliteDocs)
    .where(
      and(
        eq(sqliteDocs.isArchived, false),
        or(
          sql`LOWER(COALESCE(NULLIF(${sqliteDocs.title}, ''), 'untitled')) LIKE ${lowerSearch}`,
          sql`LOWER(${sqliteDocs.content}) LIKE ${lowerSearch}`
        )
      )
    )
    .orderBy(desc(sqliteDocs.isPinned), desc(sqliteDocs.updatedAt))
    .limit(30);
}

export async function getDocumentsList(): Promise<Omit<Document, "content">[]> {
  if (isPostgres) {
    const db = getPgDb();
    return db
      .select({
        id: pgDocs.id,
        title: pgDocs.title,
        isPinned: pgDocs.isPinned,
        isArchived: pgDocs.isArchived,
        createdAt: pgDocs.createdAt,
        updatedAt: pgDocs.updatedAt,
      })
      .from(pgDocs)
      .where(eq(pgDocs.isArchived, false))
      .orderBy(desc(pgDocs.isPinned), desc(pgDocs.updatedAt));
  }

  const db = getSqliteDb();
  return db
    .select({
      id: sqliteDocs.id,
      title: sqliteDocs.title,
      isPinned: sqliteDocs.isPinned,
      isArchived: sqliteDocs.isArchived,
      createdAt: sqliteDocs.createdAt,
      updatedAt: sqliteDocs.updatedAt,
    })
    .from(sqliteDocs)
    .where(eq(sqliteDocs.isArchived, false))
    .orderBy(desc(sqliteDocs.isPinned), desc(sqliteDocs.updatedAt));
}

export async function getDocumentById(id: string): Promise<Document | undefined> {
  if (isPostgres) {
    const db = getPgDb();
    const result = await db.select().from(pgDocs).where(eq(pgDocs.id, id)).limit(1);
    return result[0];
  }

  const db = getSqliteDb();
  const result = await db.select().from(sqliteDocs).where(eq(sqliteDocs.id, id)).limit(1);
  return result[0];
}

export async function createDocument(data?: Partial<NewDocument>): Promise<Document> {
  const id = data?.id || crypto.randomUUID();

  if (isPostgres) {
    const db = getPgDb();
    const inserted = await db
      .insert(pgDocs)
      .values({
        id,
        title: data?.title ?? "",
        content: data?.content || "",
        isPinned: data?.isPinned ?? false,
        isArchived: data?.isArchived ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return inserted[0];
  }

  const db = getSqliteDb();
  const inserted = await db
    .insert(sqliteDocs)
    .values({
      id,
      title: data?.title ?? "",
      content: data?.content || "",
      isPinned: data?.isPinned ?? false,
      isArchived: data?.isArchived ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return inserted[0];
}

export async function updateDocument(
  id: string,
  data: Partial<Omit<NewDocument, "id" | "createdAt">>
): Promise<Document | undefined> {
  if (isPostgres) {
    const db = getPgDb();
    const updated = await db
      .update(pgDocs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(pgDocs.id, id))
      .returning();
    return updated[0];
  }

  const db = getSqliteDb();
  const updated = await db
    .update(sqliteDocs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(sqliteDocs.id, id))
    .returning();
  return updated[0];
}

export async function deleteDocument(id: string, hardDelete = false): Promise<boolean> {
  if (isPostgres) {
    const db = getPgDb();
    if (hardDelete) {
      const res = await db.delete(pgDocs).where(eq(pgDocs.id, id)).returning();
      return res.length > 0;
    }
    const res = await db
      .update(pgDocs)
      .set({ isArchived: true, updatedAt: new Date() })
      .where(eq(pgDocs.id, id))
      .returning();
    return res.length > 0;
  }

  const db = getSqliteDb();
  if (hardDelete) {
    const res = await db.delete(sqliteDocs).where(eq(sqliteDocs.id, id)).returning();
    return res.length > 0;
  }
  const res = await db
    .update(sqliteDocs)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(sqliteDocs.id, id))
    .returning();
  return res.length > 0;
}