import { transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { mockTranscribeAudio } from "@/modules/editor/lib/ai";

export async function POST(req: Request) {
  try {
    const isDemoMode =
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
      process.env.DEMO_MODE === "true";

    if (isDemoMode) {
      const text = await mockTranscribeAudio();
      return Response.json({ text });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "OPENAI_API_KEY environment variable is not configured" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("audio");

    if (!file || !(file instanceof Blob)) {
      return Response.json(
        { error: "No audio file provided in request" },
        { status: 400 }
      );
    }

    const modelName = process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = new Uint8Array(arrayBuffer);

    const { text } = await transcribe({
      model: openai.transcription(modelName),
      audio: audioBuffer,
    });

    return Response.json({ text: (text || "").trim() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal transcription error";
    console.error("Transcription route error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

