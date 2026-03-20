/**
 * Order resolver - validates and fixes chapter ordering
 */

import type { Chapter, NormalizedPage } from '../core/types.js';
import { logDebug, logWarn } from '../core/logger.js';

/**
 * Sort pages by their order property
 */
export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

/**
 * Reorder chapters to ensure sequential order numbers
 */
export function normalizeOrder(chapters: Chapter[]): Chapter[] {
  const sorted = sortByOrder(chapters);

  return sorted.map((chapter, index) => ({
    ...chapter,
    order: index,
  }));
}

/**
 * Detect and resolve duplicate order values
 */
export function resolveDuplicateOrders<T extends { order: number; title?: string }>(
  items: T[]
): T[] {
  const orderMap = new Map<number, T[]>();

  // Group by order
  for (const item of items) {
    const existing = orderMap.get(item.order) || [];
    existing.push(item);
    orderMap.set(item.order, existing);
  }

  // Check for duplicates
  const hasDuplicates = Array.from(orderMap.values()).some((group) => group.length > 1);

  if (!hasDuplicates) {
    return items;
  }

  logWarn('Found duplicate order values, resolving...');

  // Flatten and re-assign orders
  const sorted = [...items].sort((a, b) => {
    // Primary sort by order
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    // Secondary sort by title (if available)
    const titleA = (a as { title?: string }).title || '';
    const titleB = (b as { title?: string }).title || '';
    return titleA.localeCompare(titleB);
  });

  return sorted.map((item, index) => ({
    ...item,
    order: index,
  }));
}

/**
 * Move a chapter to a new position
 */
export function moveChapter(
  chapters: Chapter[],
  fromIndex: number,
  toIndex: number
): Chapter[] {
  if (fromIndex === toIndex) {
    return chapters;
  }

  const result = [...chapters];
  const [moved] = result.splice(fromIndex, 1);

  if (moved) {
    result.splice(toIndex, 0, moved);
  }

  // Re-normalize order
  return normalizeOrder(result);
}

/**
 * Detect chapters that might be out of logical order
 * (e.g., "Chapter 2" appearing before "Chapter 1")
 */
export function detectOrderAnomalies(chapters: Chapter[]): string[] {
  const anomalies: string[] = [];

  // Extract chapter numbers from titles
  const chapterNumbers = chapters.map((chapter) => {
    const match = chapter.title.match(/chapter\s+(\d+)/i);
    return match?.[1] ? parseInt(match[1], 10) : null;
  });

  // Check for out-of-order numbered chapters
  let lastNumber: number | null = null;
  for (let i = 0; i < chapterNumbers.length; i++) {
    const num = chapterNumbers[i];
    const chapter = chapters[i];

    if (num !== null && num !== undefined && lastNumber !== null && num < lastNumber && chapter) {
      anomalies.push(
        `Chapter "${chapter.title}" (order ${chapter.order}) appears after a higher-numbered chapter`
      );
    }

    if (num !== null && num !== undefined) {
      lastNumber = num;
    }
  }

  if (anomalies.length > 0) {
    logWarn(`Detected ${anomalies.length} potential ordering anomalies`);
  }

  return anomalies;
}

/**
 * Group chapters by their logical sections (if any)
 */
export function groupChaptersBySection(
  chapters: Chapter[]
): Map<string, Chapter[]> {
  const groups = new Map<string, Chapter[]>();
  let currentSection = 'Main';

  for (const chapter of chapters) {
    // Detect section headers (e.g., "Part I", "Section 1")
    const sectionMatch = chapter.title.match(/^(Part|Section|Book)\s+[IVX\d]+/i);

    if (sectionMatch) {
      currentSection = chapter.title;
    }

    const existing = groups.get(currentSection) || [];
    existing.push(chapter);
    groups.set(currentSection, existing);
  }

  return groups;
}
