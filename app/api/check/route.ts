import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NextResponse } from "next/server";

const checkResponseSchema = z.object({
  issues: z.array(
    z.object({
      type: z.enum(["grammar", "clarity", "spelling"]),
      original: z.string(),
      issue: z.string(),
      explanation: z.string(),
      suggestion: z.string(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body?.text;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ issues: [] });
    }

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: checkResponseSchema,
      system: `You are a careful proofreader. You will be given one paragraph of a personal blog post. Find issues in exactly three categories:

- "grammar": subject-verb agreement, tense consistency, articles, comma splices, run-on sentences, sentence fragments
- "clarity": genuinely confusing constructions — dangling modifiers, unclear pronoun references, tangled or overloaded sentences
- "spelling": misspelled words only

Rules:
- Only flag real errors. Do not flag stylistic choices, informal tone, or things that are merely different from how you'd phrase it.
- Do not suggest rewrites for tone, vocabulary, or "better" phrasing — only fix actual errors.
- "original" must be an exact, verbatim substring of the input paragraph — copy it exactly, do not paraphrase it.
- Keep suggestions minimal — fix only what's wrong, don't rephrase surrounding correct text that isn't part of the error.
- If there are no real issues, return an empty issues array. Most well-written paragraphs should return few or zero issues — do not force a minimum number of issues just to have something to flag.`,
      prompt: text,
    });

    return NextResponse.json({ issues: object.issues });
  } catch (error) {
    console.error("Error in /api/check:", error);
    return NextResponse.json({ issues: [] }, { status: 200 });
  }
}
