import { generate, MAX_PROMPT_LENGTH, MAX_SELECTION_LENGTH } from "@/lib/ai";

export async function POST(req: Request) {
  const { text, prompt } = await req.json();

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "No prompt provided" }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return Response.json(
      { error: `Prompt too long. Max ${MAX_PROMPT_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const selectedText = typeof text === "string" ? text : "";

  if (selectedText.length > MAX_SELECTION_LENGTH) {
    return Response.json(
      { error: `Selected text too long. Max ${MAX_SELECTION_LENGTH} characters.` },
      { status: 400 }
    );
  }

  try {
    const generatedText = await generate(prompt, selectedText);
    return Response.json({ text: generatedText });
  } catch (err) {
    console.error("Generate request failed:", err);
    return Response.json(
      { error: "Generate request failed. Please try again." },
      { status: 502 }
    );
  }
}
