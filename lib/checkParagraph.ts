import { Issue } from "./types";

let idCounter = 0;

/**
 * Checks a single paragraph for grammar, clarity, and spelling issues via /api/check.
 * On network errors or non-200 responses, fails silently and returns an empty array.
 */
export async function checkParagraph(text: string): Promise<Issue[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.issues)) {
      return [];
    }

    return data.issues.map((issue: Omit<Issue, "id">, index: number) => ({
      ...issue,
      id: `issue-${Date.now()}-${++idCounter}-${index}`,
    }));
  } catch (error) {
    console.error("Failed to check paragraph:", error);
    return [];
  }
}
