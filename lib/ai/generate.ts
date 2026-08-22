import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const MODEL = "gpt-5.6-luna";

export const MAX_PROMPT_LENGTH = 300;
export const MAX_SELECTION_LENGTH = 4000;

const BASE_PROMPT = `You are the AI writing engine inside Redline, a Markdown-native writing editor. Your output is inserted directly into the user's document with no review step, so it must be ready to use exactly as written.

Rules of Operation:
- Raw Output Only: Return ONLY the text to insert. No preamble, no explanations, no "Here's the text:", no wrapping quotes, no meta-commentary about what you did.
- Markdown-Aware: The document is Markdown. Use Markdown syntax (headings, lists, bold, italics, links, etc.) where it fits the content, and match the formatting conventions already present in the surrounding or selected text.
- Follow the Prompt: Do exactly what the user's prompt asks — no more, no less. Do not pad the response with unrelated content or add sections the user didn't request.`;

function buildSystemPrompt(selectedText: string): string {
  if (!selectedText) {
    return `${BASE_PROMPT}

Mode: Generate. There is no existing selection — write new content from scratch based on the user's prompt alone.`;
  }

  return `${BASE_PROMPT}

Mode: Transform. The user has selected the text below and given an instruction for what to do to it (rewrite, expand, shorten, change tone, continue, fix, translate, etc.). Produce a replacement for the selection that satisfies the instruction. Match the length and scope implied by the instruction — don't expand a short selection into something much longer unless asked.

Selected text:
"""
${selectedText}
"""`;
}

export async function generate(prompt: string, selectedText: string): Promise<string> {
  const result = await generateText({
    model: openai(MODEL),
    system: buildSystemPrompt(selectedText),
    prompt,
  });

  return result.text;
}
