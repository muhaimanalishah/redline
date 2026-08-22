import { MAX_INPUT_LENGTH } from "@/lib/ai";
import { proofread } from "@/lib/ai/proofread";

export async function POST(req: Request) {
  const { text } = await req.json();

  if (typeof text !== "string" || text.trim().length === 0) {
    return Response.json({ error: "No text provided" }, { status: 400 });
  }

  if (text.length > MAX_INPUT_LENGTH) {
    return Response.json(
      { error: `Text too long. Max ${MAX_INPUT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    const issues = await proofread(text);
    return Response.json(issues);
  } catch {
    return Response.json(
      { error: "Proofread check failed. Please try again." },
      { status: 502 }
    );
  }
}
