export type PresetId =
  | "proofread"
  // Length
  | "shorten"
  | "expand"
  | "summarize"
  // Tone
  | "tone-professional"
  | "tone-casual"
  | "tone-direct"
  | "tone-academic"
  // Format
  | "format-bullet-list"
  | "format-table";

export interface PresetConfig {
  id: PresetId;
  label: string;
  category: "proofread" | "length" | "tone" | "format";
  description: string;
  prompt: string;
}

export const PRESETS: Record<PresetId, PresetConfig> = {
  proofread: {
    id: "proofread",
    label: "Proofread & Fix",
    category: "proofread",
    description: "Fix grammar, spelling, clarity, and punctuation issues.",
    prompt: `Detect and fix all grammatical errors, typographical mistakes, punctuation flaws, subject-verb disagreements, and awkward phrasings. Preserve the original author's voice, intent, and Markdown syntax verbatim wherever possible.`,
  },
  shorten: {
    id: "shorten",
    label: "Shorten",
    category: "length",
    description: "Make the text more concise and eliminate unnecessary words.",
    prompt: `Edit the selected text to be as concise, crisp, and high-signal as possible.
- Ruthlessly eliminate fluff, filler words, tautologies, verbose transitions, and unnecessary modifiers.
- Convert passive constructions into active voice.
- Preserve 100% of the core factual substance, nuance, and structural Markdown formatting (links, bold, code spans).
- Do not lose key context or alter the underlying message.`,
  },
  expand: {
    id: "expand",
    label: "Expand",
    category: "length",
    description: "Elaborate on ideas with additional depth and detail.",
    prompt: `Elaborate and expand on the selected text with rich detail, supporting points, concrete context, and clear explanations.
- Deepen the reasoning and unpack implied ideas thoroughly.
- Seamlessly maintain the existing tone, terminology, author voice, and Markdown structure.
- Avoid hollow padding, fluff, or generic repetitive statements — add genuinely valuable nuance and substance.`,
  },
  summarize: {
    id: "summarize",
    label: "Summarize",
    category: "length",
    description: "Condense the selection into key takeaways.",
    prompt: `Synthesize the selected text into a high-density summary.
- Highlight the core takeaways, crucial conclusions, and actionable points.
- If the content has multiple distinct points, structure them as a concise Markdown bullet list. If narrative, provide a tight single-paragraph executive summary.
- Omit minor secondary details while preserving critical context and data points.`,
  },
  "tone-professional": {
    id: "tone-professional",
    label: "Professional",
    category: "tone",
    description: "Rewrite in a polished, business-ready voice.",
    prompt: `Rewrite the selected text into an executive, polished, and professional tone.
- Use articulate, precise, and respectful vocabulary suitable for leadership and stakeholder communication.
- Remove slang, casual colloquialisms, emotional hyperbole, and tentative phrasing (e.g. "I think", "maybe").
- Maintain authoritative clarity and directness while retaining existing facts and Markdown formatting.`,
  },
  "tone-casual": {
    id: "tone-casual",
    label: "Casual",
    category: "tone",
    description: "Rewrite in a friendly, conversational voice.",
    prompt: `Rewrite the selected text into a warm, approachable, and conversational tone.
- Use natural phrasing, everyday vocabulary, and an engaging, human voice as if speaking to a peer.
- Loosen overly stiff, corporate, or academic phrasing without becoming careless, unprofessional, or full of slang.
- Preserve the exact meaning, key points, and Markdown elements.`,
  },
  "tone-direct": {
    id: "tone-direct",
    label: "Direct",
    category: "tone",
    description: "Rewrite in an assertive, actionable voice.",
    prompt: `Rewrite the selected text to be exceptionally direct, confident, and action-oriented.
- Eliminate hedging, passive voice, weak qualifiers ("somewhat", "perhaps", "kind of"), and roundabout phrasing.
- Lead with the most important point and use strong, punchy verbs.
- Keep the language assertive, unambiguous, and clear.`,
  },
  "tone-academic": {
    id: "tone-academic",
    label: "Academic",
    category: "tone",
    description: "Rewrite with scholarly precision and objective syntax.",
    prompt: `Rewrite the selected text into a formal academic and scholarly style.
- Employ objective, analytical syntax, domain-precise vocabulary, and evidence-oriented phrasing.
- Avoid first-person bias, conversational idioms, and informal shorthand.
- Maintain rigorous logical flow, balanced perspective, and exact technical terminology.`,
  },
  "format-bullet-list": {
    id: "format-bullet-list",
    label: "Bullet List",
    category: "format",
    description: "Convert content into a clean bulleted list.",
    prompt: `Transform the selected text into a clean, structured Markdown bullet list.
- Group related ideas logically with bold lead-ins for each bullet item where appropriate (e.g., "- **Key Concept**: Explanation").
- Break dense paragraphs into scannable, distinct points without omitting important facts or data.
- Ensure consistent parallel grammatical structure across all bullet points.`,
  },
  "format-table": {
    id: "format-table",
    label: "Table",
    category: "format",
    description: "Format information into a Markdown table.",
    prompt: `Analyze the selected text and convert the underlying data, comparisons, or items into a clean, well-aligned Markdown table.
- Identify the most logical column headers (e.g. "Item", "Category", "Description", "Status / Value").
- Structure each row with concise, accurate cell contents extracted from the selection.
- Return ONLY valid Markdown table syntax (| Header | Header |\\n| --- | --- |).`,
  },
};

export function isValidPreset(preset: string): preset is PresetId {
  return preset in PRESETS;
}

export function getPresetConfig(preset: PresetId): PresetConfig {
  return PRESETS[preset];
}
