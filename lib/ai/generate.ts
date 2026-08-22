import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const MODEL = "gpt-5.6-luna";

export const MAX_PROMPT_LENGTH = 300;
export const MAX_SELECTION_LENGTH = 4000;

const BASE_PROMPT = `You are the specialized AI writing and transformation engine inside Redline, a minimalist, high-focus Markdown writing editor.
Your output is streamed and inserted directly into the user's active editor document with zero intermediate human editing step, so it must be 100% complete, correct, and ready for immediate reading.

Core Operating Invariants:
1. RAW OUTPUT ONLY: Return ONLY the exact replacement or generated Markdown text. Absolutely NO conversational preamble, NO "Here is your text:", NO concluding remarks, NO quotes wrapping the response, and NO meta-commentary about what you changed.
2. MARKDOWN NATIVE: Respect and match all Markdown syntax (headings, bullet/ordered lists, blockquotes, inline links, code blocks, bold/italics, tables). Maintain exact formatting consistency with the user's surrounding document.
3. STRICT SINGLE INTENT: Execute ONLY the exact instruction given in the prompt. Do not over-reach, add unsolicited sections, shift tone when only asked to adjust length, or alter style when only asked to proofread.`;

function buildSystemPrompt(selectedText: string): string {
  if (!selectedText) {
    return `${BASE_PROMPT}

Editor Context: Generation Mode (No Selection)
The user has not selected any text. Generate fresh, high-quality Markdown content from scratch strictly following their prompt.`;
  }

  return `${BASE_PROMPT}

Editor Context: In-Place Selection Transformation Mode
The user has highlighted the text below in their Redline document. Your response will replace this exact selection in their editor. Execute the prompt with surgical precision while preserving all facts, meaning, and Markdown syntax unless explicitly instructed otherwise.

Selected Text:
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

export function streamGenerate(prompt: string, selectedText: string) {
  return streamText({
    model: openai(MODEL),
    system: buildSystemPrompt(selectedText),
    prompt,
  });
}

