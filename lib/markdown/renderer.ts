/**
 * Lightweight, zero-dependency Markdown to sanitized HTML renderer for
 * real-time streaming previews inside ProseMirror widget decorations.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(text: string): string {
  let res = escapeHtml(text);
  // Code spans
  res = res.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Bold + Italic
  res = res.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Bold
  res = res.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic
  res = res.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Links
  res = res.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return res;
}

export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return "";

  const lines = markdown.split("\n");
  const htmlChunks: string[] = [];

  let inTable = false;
  let inList = false;

  const closeListIfOpen = () => {
    if (inList) {
      htmlChunks.push("</ul>");
      inList = false;
    }
  };

  const closeTableIfOpen = () => {
    if (inTable) {
      htmlChunks.push("</tbody></table>");
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line resets block context
    if (!trimmed) {
      closeListIfOpen();
      closeTableIfOpen();
      continue;
    }

    // Markdown Table Row: | Col 1 | Col 2 |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      closeListIfOpen();

      // Check for delimiter row: | --- | --- |
      if (/^\|[\s\-:|]+\|$/.test(trimmed)) {
        continue;
      }

      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      if (!inTable) {
        inTable = true;
        htmlChunks.push('<table class="preview-table"><thead><tr>');
        cells.forEach((cell) => {
          htmlChunks.push(`<th>${formatInline(cell)}</th>`);
        });
        htmlChunks.push("</tr></thead><tbody>");
      } else {
        htmlChunks.push("<tr>");
        cells.forEach((cell) => {
          htmlChunks.push(`<td>${formatInline(cell)}</td>`);
        });
        htmlChunks.push("</tr>");
      }
      continue;
    } else {
      closeTableIfOpen();
    }

    // Markdown Bullet List Item: - item or * item
    if (/^[-*]\s+/.test(trimmed)) {
      closeTableIfOpen();
      if (!inList) {
        inList = true;
        htmlChunks.push('<ul class="preview-list">');
      }
      const itemContent = trimmed.replace(/^[-*]\s+/, "");
      htmlChunks.push(`<li>${formatInline(itemContent)}</li>`);
      continue;
    } else {
      closeListIfOpen();
    }

    // Headings: # H1, ## H2, ### H3
    if (trimmed.startsWith("### ")) {
      htmlChunks.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
      continue;
    }
    if (trimmed.startsWith("## ")) {
      htmlChunks.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("# ")) {
      htmlChunks.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
      continue;
    }

    // Regular Paragraph
    htmlChunks.push(`<p>${formatInline(trimmed)}</p>`);
  }

  closeListIfOpen();
  closeTableIfOpen();

  return htmlChunks.join("");
}
