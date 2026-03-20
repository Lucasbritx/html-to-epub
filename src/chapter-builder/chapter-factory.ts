/**
 * Chapter factory - creates Chapter objects from normalized pages
 */

import { createHash } from 'crypto';
import type { NormalizedPage, Chapter } from '../core/types.js';
import { logDebug } from '../core/logger.js';
import { extractPathId } from '../utils/url.js';

/**
 * Create a chapter from a normalized page
 */
export function createChapter(page: NormalizedPage, index: number): Chapter {
  const id = generateChapterId(page.url, index);
  const title = sanitizeTitle(page.title);

  return {
    id,
    title,
    content: wrapChapterContent(page.content, title),
    order: page.order,
    sourceUrl: page.url,
  };
}

/**
 * Create multiple chapters from normalized pages
 */
export function createChapters(pages: NormalizedPage[]): Chapter[] {
  const chapters: Chapter[] = [];
  const titleCounts = new Map<string, number>();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) continue;

    let title = sanitizeTitle(page.title);

    // Handle duplicate titles by appending a number
    const count = titleCounts.get(title) || 0;
    if (count > 0) {
      title = `${title} (${count + 1})`;
    }
    titleCounts.set(page.title, count + 1);

    const chapter = createChapter({ ...page, title }, i);
    chapters.push(chapter);
  }

  logDebug(`Created ${chapters.length} chapters`);
  return chapters;
}

/**
 * Generate a stable chapter ID from URL
 */
export function generateChapterId(url: string, index: number): string {
  // Try to extract a meaningful ID from the URL path
  const pathId = extractPathId(url);

  if (pathId && pathId !== 'index' && pathId !== 'page') {
    return `chapter-${pathId}`;
  }

  // Fallback to hash-based ID
  const hash = createHash('md5')
    .update(url)
    .digest('hex')
    .substring(0, 8);

  return `chapter-${index + 1}-${hash}`;
}

/**
 * Sanitize a chapter title for use in EPUB
 */
export function sanitizeTitle(title: string): string {
  if (!title) {
    return 'Untitled';
  }

  return title
    .trim()
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Remove problematic characters for EPUB
    .replace(/[<>&"']/g, '')
    // Normalize whitespace (do this last)
    .replace(/\s+/g, ' ')
    // Limit length
    .substring(0, 200)
    .trim() || 'Untitled';
}

/**
 * Wrap chapter content in proper XHTML structure
 */
export function wrapChapterContent(content: string, title: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta charset="UTF-8" />
  <title>${escapeXml(title)}</title>
</head>
<body>
  ${content}
</body>
</html>`;
}

/**
 * Escape special characters for XML/XHTML
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Filter out empty or invalid chapters
 */
export function filterValidChapters(chapters: Chapter[]): Chapter[] {
  return chapters.filter((chapter) => {
    // Check for minimum content length
    const textContent = chapter.content.replace(/<[^>]+>/g, '').trim();
    
    if (textContent.length < 50) {
      logDebug(`Filtering out empty chapter: ${chapter.title}`);
      return false;
    }

    return true;
  });
}
