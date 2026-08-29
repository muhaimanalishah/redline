import { z } from "zod";
import { getDocumentsList, createDocument, searchDocuments } from "@/db/queries";

const CreateDocSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
});

function stripMarkdown(md: string): string {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, "") // Images
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Links
    .replace(/`{1,3}.*?`{1,3}/g, "") // Code
    .replace(/^#+\s+/gm, "") // Headings
    .replace(/^[\*\-+]\s+/gm, "") // List bullets
    .replace(/^>\s+/gm, "") // Quotes
    .replace(/[*_~]/g, "") // Bold/Italics/Strikethrough
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function extractSnippet(content: string, query: string, maxLength = 120): string | null {
  if (!content) return null;
  const clean = stripMarkdown(content);
  if (!clean) return null;

  const lowerContent = clean.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) {
    // If no direct content match (e.g. title matched), provide the beginning of the text
    return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
  }

  const start = Math.max(0, matchIndex - 35);
  const end = Math.min(clean.length, matchIndex + query.length + 65);

  let snippet = clean.slice(start, end);
  if (start > 0) snippet = `...${snippet}`;
  if (end < clean.length) snippet = `${snippet}...`;

  return snippet;
}

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
