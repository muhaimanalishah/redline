import { PresetId } from "./presets";

export interface MockAiPayload {
  mode: "preset" | "custom";
  preset?: string;
  prompt?: string;
  text?: string;
}

function mockProofread(text: string): string {
  if (!text.trim()) return text;
  // Apply smart typo & grammar fixes while keeping structure
  return text
    .replace(/\bteh\b/gi, "the")
    .replace(/\brecieve\b/gi, "receive")
    .replace(/\bseperate\b/gi, "separate")
    .replace(/\boccured\b/gi, "occurred")
    .replace(/\buntill\b/gi, "until")
    .replace(/\bi\b/g, "I")
    .replace(/\s+,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/([.!?])\s*([a-z])/g, (_, p1, p2) => `${p1} ${p2.toUpperCase()}`)
    .replace(/\btheir\s+is\b/gi, "there is")
    .replace(/\bits\s+a\b/gi, "it's a")
    .replace(/\bcant\b/gi, "cannot")
    .replace(/\bdont\b/gi, "do not");
}

function mockShorten(text: string): string {
  if (!text.trim()) return text;
  return text
    .replace(/\bin order to\b/gi, "to")
    .replace(/\bdue to the fact that\b/gi, "because")
    .replace(/\bas a matter of fact\b/gi, "actually")
    .replace(/\bat the present moment\b/gi, "currently")
    .replace(/\bfor the purpose of\b/gi, "for")
    .replace(/\bin the event that\b/gi, "if")
    .replace(/\bhas the ability to\b/gi, "can")
    .replace(/\bvery\s+/gi, "")
    .replace(/\breally\s+/gi, "")
    .replace(/\bbasically\s+/gi, "")
    .replace(/\bessentially\s+/gi, "")
    .trim();
}

function mockExpand(text: string): string {
  if (!text.trim()) return text;
  const trimmed = text.trim();
  const endsWithPunct = /[.!?]$/.test(trimmed);
  const base = endsWithPunct ? trimmed : `${trimmed}.`;
  return `${base} Specifically, this provides additional clarity and ensures seamless execution across all components involved.`;
}

function mockSummarize(text: string): string {
  if (!text.trim()) return text;
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  if (sentences.length <= 1) {
    return `- **Summary**: ${text.trim()}`;
  }

  return sentences
    .slice(0, 4)
    .map((s, idx) => `- **Point ${idx + 1}**: ${s.trim()}`)
    .join("\n");
}

function mockToneProfessional(text: string): string {
  if (!text.trim()) return text;
  return text
    .replace(/\bhey\b/gi, "Greetings")
    .replace(/\bgood\b/gi, "effective")
    .replace(/\bbad\b/gi, "suboptimal")
    .replace(/\bfix\b/gi, "resolve")
    .replace(/\btalk about\b/gi, "address")
    .replace(/\blet's\b/gi, "we propose to")
    .replace(/\bget\b/gi, "obtain")
    .replace(/\bhelp\b/gi, "assist")
    .replace(/\bthanks\b/gi, "Thank you");
}

function mockToneCasual(text: string): string {
  if (!text.trim()) return text;
  return text
    .replace(/\bGreetings\b/gi, "Hey there")
    .replace(/\bresolve\b/gi, "fix")
    .replace(/\butilize\b/gi, "use")
    .replace(/\bfacilitate\b/gi, "help with")
    .replace(/\boptimal\b/gi, "great")
    .replace(/\bpurchase\b/gi, "buy")
    .replace(/\bcommence\b/gi, "start");
}

function mockToneDirect(text: string): string {
  if (!text.trim()) return text;
  return text
    .replace(/\bI think that maybe we should\b/gi, "We should")
    .replace(/\bIt might be possible to\b/gi, "We will")
    .replace(/\bPlease feel free to\b/gi, "Please")
    .replace(/\bIn my opinion,\s*/gi, "")
    .replace(/\bCould you please\b/gi, "Please")
    .trim();
}

function mockToneAcademic(text: string): string {
  if (!text.trim()) return text;
  return text
    .replace(/\bshow\b/gi, "demonstrate")
    .replace(/\buse\b/gi, "utilize")
    .replace(/\bfind\b/gi, "observe")
    .replace(/\bthink\b/gi, "hypothesize")
    .replace(/\bbig\b/gi, "substantial")
    .replace(/\blot of\b/gi, "myriad of");
}

function mockFormatBulletList(text: string): string {
  if (!text.trim()) return text;
  const items = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (items.length <= 1) {
    return `- ${text.trim()}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

function mockFormatTable(text: string): string {
  if (!text.trim()) return text;
  const items = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let table = `| Item | Description |\n| --- | --- |\n`;
  items.slice(0, 5).forEach((item, idx) => {
    table += `| Entry ${idx + 1} | ${item.replace(/\|/g, "\\|")} |\n`;
  });

  return table.trim();
}

function mockCustomPrompt(prompt: string, text: string): string {
  const cleanPrompt = prompt.toLowerCase();
  const source = text.trim() || "Sample text content.";

  if (cleanPrompt.includes("translate") || cleanPrompt.includes("spanish")) {
    return `[Demo Translation]: ${source}`;
  }
  if (cleanPrompt.includes("header") || cleanPrompt.includes("heading") || cleanPrompt.includes("title")) {
    return `## ${source}\n\nKey details and considerations regarding this topic.`;
  }
  if (cleanPrompt.includes("code") || cleanPrompt.includes("typescript") || cleanPrompt.includes("javascript")) {
    return "```typescript\n// Demo generated code snippet\nfunction processText(input: string): string {\n  return input.trim();\n}\n```";
  }

  return `${source}\n\n> **AI Insight (${prompt})**: Improved and formatted for optimal readability.`;
}

export function generateMockAiContent(payload: MockAiPayload): string {
  const { mode, preset, prompt, text = "" } = payload;

  if (mode === "preset" && preset) {
    switch (preset as PresetId) {
      case "proofread":
        return mockProofread(text);
      case "shorten":
        return mockShorten(text);
      case "expand":
        return mockExpand(text);
      case "summarize":
        return mockSummarize(text);
      case "tone-professional":
        return mockToneProfessional(text);
      case "tone-casual":
        return mockToneCasual(text);
      case "tone-direct":
        return mockToneDirect(text);
      case "tone-academic":
        return mockToneAcademic(text);
      case "format-bullet-list":
        return mockFormatBulletList(text);
      case "format-table":
        return mockFormatTable(text);
      default:
        return mockProofread(text);
    }
  }

  if (mode === "custom" && prompt) {
    return mockCustomPrompt(prompt, text);
  }

  return text;
}

const MOCK_DICTATIONS = [
  "Here is a dictated paragraph demonstrating Redline's speech-to-text integration with live diff reviews.",
  "Let's outline our roadmap for the upcoming quarter, focusing on user experience, performance, and clean offline-first architecture.",
  "In this draft, we explore how seamless inline visual diffs streamline markdown editing and review workflows.",
  "Notes from today's sync: finalize database adapters, verify responsive layouts, and prepare release documentation.",
];

export async function mockTranscribeAudio(): Promise<string> {
  // Simulate realistic processing latency
  await new Promise((resolve) => setTimeout(resolve, 350));
  const randomIndex = Math.floor(Math.random() * MOCK_DICTATIONS.length);
  return MOCK_DICTATIONS[randomIndex];
}

/**
 * Creates a stream that emits the simulated output word-by-word with realistic typing latency.
 */
export function streamMockAiResponse(payload: MockAiPayload): Response {
  const targetContent = generateMockAiContent(payload);
  const encoder = new TextEncoder();

  // Split into natural word chunks for realistic streaming
  const chunks = targetContent.match(/(\S+\s*|\s+)/g) || [targetContent];

  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        // Simulate realistic typing / generation latency between 15-30ms
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Demo-Mode": "true",
    },
  });
}
