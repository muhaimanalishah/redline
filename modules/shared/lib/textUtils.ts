/**
 * Utility functions for text manipulation, regex escaping, and markdown processing.
 */

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/!\[.*?\]\(.*?\)/g, "") // Images
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // Links
    .replace(/`{1,3}.*?`{1,3}/g, "") // Code
    .replace(/^#+\s+/gm, "") // Headings
    .replace(/^[\*\-+]\s+/gm, "") // List bullets
    .replace(/^>\s+/gm, "") // Quotes
    .replace(/[*_~]/g, "") // Bold/Italics/Strikethrough
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

export function extractSnippet(content: string, query: string, maxLength = 120): string | null {
  if (!content) return null;
  const clean = stripMarkdown(content);
  if (!clean) return null;

  const lowerContent = clean.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return clean.length > maxLength ? `${clean.slice(0, maxLength)}...` : clean;
  }

  const start = Math.max(0, matchIndex - 35);
  const end = Math.min(clean.length, matchIndex + query.length + 65);

  let snippet = clean.slice(start, end);
  if (start > 0) snippet = `...${snippet}`;
  if (end < clean.length) snippet = `${snippet}...`;

  return snippet;
}

export function sanitizeTitle(title?: string | null): string {
  if (!title) return "";
  const trimmed = title.trim();
  return trimmed === "Untitled" ? "" : trimmed;
}

export function sanitizeContent(content?: string | null): string {
  if (!content) return "";
  if (content === "# Untitled\n\n" || content === "# Untitled\n" || content === "# Untitled") {
    return "";
  }
  return content;
}
