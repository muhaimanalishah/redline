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

  const prompt =
    data.mode === "preset"
      ? getPresetConfig(data.preset as PresetId).prompt
      : data.prompt;
  const text = data.text;

  try {
    const result = streamGenerate(prompt, text);
    return createTextStreamResponse({
      stream: toTextStream({ stream: result.stream }),
    });
  } catch (err) {
    console.error("AI Generation error:", err);
    return Response.json(
      { error: "AI execution failed. Please try again." },
      { status: 502 }
    );
  }

}
