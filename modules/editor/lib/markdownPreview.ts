/**
 * Minimal, zero-dependency Markdown to HTML parser specifically for rich diff previews.
 * Handles headings, tables, bullet lists, ordered lists, inline bold/italic/code, and paragraphs.
 * Fully sanitizes URLs and escapes all text nodes to prevent XSS.
 */

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  // Only permit safe, explicit web/mail protocols or relative root paths
  if (/^(https?:\/\/|mailto:|\/)/i.test(trimmed)) {
    return trimmed.replace(/"/g, "&quot;");
  }
  return "#";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInline(text: string): string {
  // First, extract inline code spans to prevent markdown parsing inside code
  const codeSpans: string[] = [];
  const withPlaceholders = text.replace(/`([^`]+)`/g, (_match, codeContent) => {
    codeSpans.push(escapeHtml(codeContent));
    return `__CODE_${codeSpans.length - 1}__`;
  });

  // Escape HTML characters in non-code text
  let html = escapeHtml(withPlaceholders);

  // Markdown links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, linkUrl) => {
    const safeHref = sanitizeUrl(linkUrl);
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  });

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.*?)~~/g, "<del>$1</del>");

  // Restore code spans
  html = html.replace(/__CODE_(\d+)__/g, (_match, index) => {
    return `<code>${codeSpans[Number(index)]}</code>`;
  });

  return html;
}

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

    // Blockquote
    const quoteMatch = trimmed.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      flushList();
      htmlChunks.push(`<blockquote><p>${renderInline(quoteMatch[1])}</p></blockquote>`);
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
