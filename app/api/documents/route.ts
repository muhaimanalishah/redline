import { z } from "zod";
import { getDocumentsList, createDocument, searchDocuments } from "@/db/queries";
import { extractSnippet } from "@/modules/shared/lib/textUtils";

const CreateDocSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (query !== null) {
      const cleanQuery = query.trim();
      if (!cleanQuery) {
        return Response.json([]);
      }

      const docs = await searchDocuments(cleanQuery);

      const results = docs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        snippet: extractSnippet(doc.content, cleanQuery),
        isPinned: doc.isPinned,
        updatedAt: doc.updatedAt,
      }));

      return Response.json(results);
    }

    const list = await getDocumentsList();
    return Response.json(list);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return Response.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = CreateDocSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request payload" },
        { status: 400 },
      );
    }

    const doc = await createDocument(parsed.data);
    return Response.json(doc, { status: 201 });
  } catch (error) {
    console.error("Failed to create document:", error);
    return Response.json(
      { error: "Failed to create document" },
      { status: 500 },
    );
  }
}
