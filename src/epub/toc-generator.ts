/**
 * TOC generator - creates table of contents structure for EPUB
 */

import type { Chapter } from '../core/types.js';
import type { EpubContent } from './metadata-builder.js';
import { logDebug } from '../core/logger.js';

/**
 * TOC entry representing a chapter in the table of contents
 */
export interface TocEntry {
  id: string;
  title: string;
  order: number;
  level: number;
  children: TocEntry[];
}

/**
 * Convert chapters to EPUB content entries
 */
export function chaptersToContent(chapters: Chapter[]): EpubContent[] {
  logDebug(`Converting ${chapters.length} chapters to EPUB content`);

  return chapters.map((chapter) => ({
    title: chapter.title,
    data: chapter.content,
    filename: `${chapter.id}.xhtml`,
    excludeFromToc: false,
    beforeToc: false,
  }));
}

/**
 * Build a flat table of contents from chapters
 */
export function buildFlatToc(chapters: Chapter[]): TocEntry[] {
  return chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    level: 0,
    children: [],
  }));
}

/**
 * Build a hierarchical table of contents by inferring structure from titles
 * 
 * This attempts to create a nested TOC based on common patterns:
 * - Numbered chapters (1. Introduction, 1.1 Overview)
 * - Part/Chapter markers
 * - Indentation levels
 */
export function buildHierarchicalToc(chapters: Chapter[]): TocEntry[] {
  const entries: TocEntry[] = [];
  const stack: TocEntry[] = [];

  for (const chapter of chapters) {
    const level = inferTocLevel(chapter.title);
    const entry: TocEntry = {
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      level,
      children: [],
    };

    // Pop stack until we find a parent at a lower level
    while (stack.length > 0 && stack[stack.length - 1]!.level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      // Top-level entry
      entries.push(entry);
    } else {
      // Add as child of the current parent
      stack[stack.length - 1]!.children.push(entry);
    }

    stack.push(entry);
  }

  return entries;
}

/**
 * Infer the TOC level (depth) from a chapter title
 * 
 * Returns 0 for top-level, 1 for sub-section, etc.
 */
export function inferTocLevel(title: string): number {
  const trimmed = title.trim();

  // Check for numbered patterns like "1.2.3 Title"
  const numberedMatch = trimmed.match(/^(\d+\.)*\d+[\.\s]/);
  if (numberedMatch) {
    const dots = (numberedMatch[0]?.match(/\./g) || []).length;
    return dots;
  }

  // Check for Part/Chapter/Section markers
  const lowerTitle = trimmed.toLowerCase();

  if (/^(part|book)\s+[\divxlc]+/i.test(trimmed)) {
    return 0; // Parts are top-level
  }

  if (/^chapter\s+[\divxlc]+/i.test(trimmed)) {
    return 0; // Chapters are top-level (or under parts)
  }

  if (/^section\s+[\d.]+/i.test(trimmed)) {
    return 1; // Sections are under chapters
  }

  if (/^appendix\s+[a-z]/i.test(trimmed)) {
    return 0; // Appendices are top-level
  }

  // Check for sub- prefixes in the title
  if (lowerTitle.includes('introduction') || lowerTitle.includes('overview')) {
    return 0;
  }

  if (lowerTitle.includes('conclusion') || lowerTitle.includes('summary')) {
    return 0;
  }

  // Default to level 0 (flat structure)
  return 0;
}

/**
 * Generate HTML for a custom TOC page
 */
export function generateTocHtml(toc: TocEntry[], title: string = 'Table of Contents'): string {
  const renderEntry = (entry: TocEntry, depth: number = 0): string => {
    const indent = '  '.repeat(depth);
    const link = `<a href="${entry.id}.xhtml">${escapeHtml(entry.title)}</a>`;

    if (entry.children.length === 0) {
      return `${indent}<li>${link}</li>`;
    }

    const children = entry.children
      .map((child) => renderEntry(child, depth + 1))
      .join('\n');

    return `${indent}<li>
${indent}  ${link}
${indent}  <ol>
${children}
${indent}  </ol>
${indent}</li>`;
  };

  const tocItems = toc.map((entry) => renderEntry(entry)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    nav ol {
      list-style-type: none;
      padding-left: 1.5em;
    }
    nav > ol {
      padding-left: 0;
    }
    nav li {
      margin: 0.5em 0;
    }
    nav a {
      text-decoration: none;
      color: inherit;
    }
    nav a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>${escapeHtml(title)}</h1>
    <ol>
${tocItems}
    </ol>
  </nav>
</body>
</html>`;
}

/**
 * Create a TOC content entry for inclusion in the EPUB
 */
export function createTocContent(chapters: Chapter[]): EpubContent | null {
  // epub-gen-memory handles TOC generation automatically
  // This is only needed for custom TOC pages
  if (chapters.length === 0) {
    return null;
  }

  const toc = buildFlatToc(chapters);
  const html = generateTocHtml(toc);

  return {
    title: 'Table of Contents',
    data: html,
    filename: 'toc.xhtml',
    excludeFromToc: true,
    beforeToc: true,
  };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Flatten a hierarchical TOC back to a flat list
 */
export function flattenToc(entries: TocEntry[]): TocEntry[] {
  const result: TocEntry[] = [];

  const flatten = (items: TocEntry[]): void => {
    for (const item of items) {
      result.push({ ...item, children: [] });
      if (item.children.length > 0) {
        flatten(item.children);
      }
    }
  };

  flatten(entries);
  return result;
}
