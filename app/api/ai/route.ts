import { z } from "zod";
import { createTextStreamResponse, toTextStream } from "ai";
import {
  streamGenerate,
  isValidPreset,
  getPresetConfig,
  PresetId,
  MAX_PROMPT_LENGTH,
  MAX_SELECTION_LENGTH,
} from "@/modules/editor/lib/ai";

const PresetRequestSchema = z.object({
  mode: z.literal("preset"),
  preset: z.string().refine(isValidPreset, {
    message: "Invalid or unsupported preset",
  }),
  text: z
    .string()
    .min(1, "No text provided for preset")
    .max(MAX_SELECTION_LENGTH, `Selected text too long. Max ${MAX_SELECTION_LENGTH} characters.`),
});

const CustomRequestSchema = z.object({
  mode: z.literal("custom"),
  prompt: z
    .string()
    .trim()
    .min(1, "No prompt provided")
    .max(MAX_PROMPT_LENGTH, `Prompt too long. Max ${MAX_PROMPT_LENGTH} characters.`),
  text: z
    .string()
    .max(MAX_SELECTION_LENGTH, `Selected text too long. Max ${MAX_SELECTION_LENGTH} characters.`)
    .optional()
    .default(""),
});

const RequestSchema = z.discriminatedUnion("mode", [
  PresetRequestSchema,
  CustomRequestSchema,
]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid request payload";
    return Response.json({ error: firstError }, { status: 400 });
  }

  const data = parsed.data;

  // --- Preset Mode ---
  if (data.mode === "preset") {
    const presetId = data.preset as PresetId;
    const config = getPresetConfig(presetId);

    try {
      const result = streamGenerate(config.prompt, data.text);
      return createTextStreamResponse({
        stream: toTextStream({ stream: result.stream }),
      });
    } catch (err) {
      console.error(`Preset '${presetId}' streaming failed:`, err);
      return Response.json(
        { error: `Preset '${config.label}' execution failed. Please try again.` },
        { status: 502 }
      );
    }
  }

  // --- Custom Mode ---
  try {
    const result = streamGenerate(data.prompt, data.text);
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
