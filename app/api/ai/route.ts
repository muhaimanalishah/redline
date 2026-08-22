import { createTextStreamResponse, toTextStream } from "ai";
import {
  streamGenerate,
  isValidPreset,
  getPresetConfig,
  PresetId,
  MAX_PROMPT_LENGTH,
  MAX_SELECTION_LENGTH,
} from "@/lib/ai";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const { mode, text, prompt, preset } = body as {
    mode?: string;
    text?: unknown;
    prompt?: unknown;
    preset?: unknown;
  };

  if (!mode || (mode !== "preset" && mode !== "custom")) {
    return Response.json(
      { error: "Invalid mode. Expected 'preset' or 'custom'." },
      { status: 400 }
    );
  }

  // --- Preset Mode ---
  if (mode === "preset") {
    if (typeof preset !== "string" || !isValidPreset(preset)) {
      return Response.json(
        { error: `Invalid or missing preset. Received: '${preset}'` },
        { status: 400 }
      );
    }

    const targetText = typeof text === "string" ? text : "";
    if (!targetText.trim()) {
      return Response.json({ error: "No text provided for preset" }, { status: 400 });
    }

    if (targetText.length > MAX_SELECTION_LENGTH) {
      return Response.json(
        { error: `Selected text too long. Max ${MAX_SELECTION_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const config = getPresetConfig(preset as PresetId);

    try {
      const result = streamGenerate(config.prompt, targetText);
      return createTextStreamResponse({
        stream: toTextStream({ stream: result.stream }),
      });
    } catch (err) {
      console.error(`Preset '${preset}' streaming failed:`, err);
      return Response.json(
        { error: `Preset '${config.label}' execution failed. Please try again.` },
        { status: 502 }
      );
    }
  }

  // --- Custom Mode ---
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
    const result = streamGenerate(prompt, selectedText);
    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    });
  } catch (err) {
    console.error("Custom generate streaming failed:", err);
    return Response.json(
      { error: "Generate request failed. Please try again." },
      { status: 502 }
    );
  }
}
