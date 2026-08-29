import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "./index";
import { documents, Document, NewDocument } from "./schema";

export async function searchDocuments(query: string): Promise<Document[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];

  const searchTerm = `%${cleanQuery}%`;

  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.isArchived, false),
        or(
          like(documents.title, searchTerm),
          like(documents.content, searchTerm)
        )
      )
    )
    .orderBy(desc(documents.isPinned), desc(documents.updatedAt))
    .limit(30);
}

export async function getDocumentsList(): Promise<Omit<Document, "content">[]> {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      isPinned: documents.isPinned,
      isArchived: documents.isArchived,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(eq(documents.isArchived, false))
    .orderBy(desc(documents.isPinned), desc(documents.updatedAt));
}

export async function getDocumentById(id: string): Promise<Document | undefined> {
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function createDocument(data?: Partial<NewDocument>): Promise<Document> {
  const id = data?.id || crypto.randomUUID();
  const newDoc: NewDocument = {
    id,
    title: data?.title ?? "",
    content: data?.content || "",
    isPinned: data?.isPinned ?? false,
    isArchived: data?.isArchived ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const inserted = await db.insert(documents).values(newDoc).returning();
  return inserted[0];
}

export async function updateDocument(
  id: string,
  data: Partial<Omit<NewDocument, "id" | "createdAt">>
): Promise<Document | undefined> {
  const updated = await db
    .update(documents)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, id))
    .returning();

  return updated[0];
}

export async function deleteDocument(id: string, hardDelete = false): Promise<boolean> {
  if (hardDelete) {
    const res = await db.delete(documents).where(eq(documents.id, id)).returning();
    return res.length > 0;
  }
  const res = await db
    .update(documents)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();
  return res.length > 0;
}