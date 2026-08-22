import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { issueSchema, ProofreadResult } from "./schema";
import { filterValidIssues } from "./utils";

const MODEL = "gpt-5.6-luna";
const MAX_RETRIES = 1;

export const MAX_INPUT_LENGTH = 1500;

const SYSTEM_PROMPT = `You are the core proofreading engine for Redline, an inline writing assistant. Redline highlights errors directly in the user's text and provides one-click atomic replacements.

Your task is to detect clear errors in the provided text across four distinct categories:

1. "grammar":
   Mechanical and structural syntax errors — subject-verb disagreement (e.g., "the box of apples were dropped"), tense inconsistency, comma splices between independent clauses, run-on sentences, and punctuation faults.

2. "spelling":
   Non-dictionary words and typographical errors only (e.g., "tommorrow", "goverment", "recieve").

3. "word-choice":
   Valid English dictionary words used incorrectly in context, misused idioms, wrong prepositions, or confusable pairs / homophones (e.g., "stationary" vs "stationery", "bare" vs "bear", "elicit" vs "illicit", "for all intensive purposes").

4. "clarity":
   Structural constructions that obscure meaning — dangling modifiers or pronouns with ambiguous antecedents.

Rules of Operation for Redline:
- Precision First: Redline is a high-precision tool. Never flag stylistic preferences, rhetorical devices, or informal conversational tone. If the text is correct, return an empty list.
- Non-Destructive Corrections: Each suggestion must be a clean, minimal replacement for the flagged span so the user can accept it with one click without altering surrounding correct text.
- Cohesive Clause Fixes: When fixing clarity or run-on issues, ensure the suggested replacement forms a fully grammatical, coherent clause.
- Verbatim Extraction: "original" must be an exact, character-for-character substring of the input text.
- Preserve Jargon & Code: Ignore code snippets, markdown syntax, technical terminology, acronyms, and proper nouns.
- Concise Notes: Keep the "issue" description direct, brief, and educational.`;

async function callModel(text: string) {
  return generateText({
    model: openai(MODEL),
    system: SYSTEM_PROMPT,
    prompt: text,
    output: Output.object({ schema: issueSchema }),
    providerOptions: {
      openai: {
        reasoningEffort: "none",
      },
    },
  });
}

export async function proofread(text: string): Promise<ProofreadResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callModel(text);
      if (!result.output) {
        throw new Error("Model returned no structured output");
      }
      return {
        issues: filterValidIssues(result.output.issues, text),
      };
    } catch (err) {
      lastError = err;
    }
  }

  console.error("Proofread check failed after retry:", lastError);
  throw new Error("Proofread check failed");
}
