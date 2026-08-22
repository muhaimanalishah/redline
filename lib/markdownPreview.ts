/**
 * Minimal, zero-dependency Markdown to HTML parser specifically for rich diff previews.
 * Handles headings, tables, bullet lists, ordered lists, inline bold/italic/code, and paragraphs.
 */
export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const lines = markdown.trim().split(/\r?\n/);
  const htmlChunks: string[] = [];

  let inTable = false;
  let inUl = false;
  let inOl = false;
  let tableRows: string[] = [];

  const flushList = () => {
    if (inUl) {
      htmlChunks.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlChunks.push("</ol>");
      inOl = false;
    }
  };

  const flushTable = () => {
    if (!inTable || tableRows.length === 0) return;

    let tableHtml = "<table>";
    let isHeader = true;

    for (const rowLine of tableRows) {
      // Check if this is the separator row: | --- | --- |
      if (/^\s*\|?(\s*:?-+:?\s*\|)+\s*$/.test(rowLine)) {
        isHeader = false;
        continue;
      }

      const cells = rowLine
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());

      tableHtml += "<tr>";
      const tag = isHeader ? "th" : "td";
      for (const cell of cells) {
        tableHtml += `<${tag}>${renderInline(cell)}</${tag}>`;
      }
      tableHtml += "</tr>";
    }

    tableHtml += "</table>";
    htmlChunks.push(tableHtml);
    tableRows = [];
    inTable = false;
  };

  const renderInline = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Table Row Detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      inTable = true;
      tableRows.push(trimmed);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      htmlChunks.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Bullet List
    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      if (!inUl) {
        flushList();
        htmlChunks.push("<ul>");
        inUl = true;
      }
      htmlChunks.push(`<li>${renderInline(bulletMatch[1])}</li>`);
      continue;
    }

    // Ordered List
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      if (!inOl) {
        flushList();
        htmlChunks.push("<ol>");
        inOl = true;
      }
      htmlChunks.push(`<li>${renderInline(orderedMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph
    flushList();
    htmlChunks.push(`<p>${renderInline(trimmed)}</p>`);
  }

  flushList();
  flushTable();

  return htmlChunks.join("");
}
