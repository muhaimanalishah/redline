import { z } from "zod";
import { getDocumentById, updateDocument, deleteDocument } from "@/db/queries";

const UpdateDocSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const doc = await getDocumentById(id);
    if (!doc) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }
    return Response.json(doc);
  } catch (error) {
    console.error("Failed to fetch document:", error);
    return Response.json(
      { error: "Failed to fetch document" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = UpdateDocSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid update payload" },
        { status: 400 },
      );
    }

    const updated = await updateDocument(id, parsed.data);
    if (!updated) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (error) {
    console.error("Failed to update document:", error);
    return Response.json(
      { error: "Failed to update document" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const success = await deleteDocument(id);
    if (!success) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return Response.json(
      { error: "Failed to delete document" },
      { status: 500 },
    );
  }
}
