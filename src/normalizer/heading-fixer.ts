/**
 * Heading fixer - normalizes heading hierarchy
 * Preserves original hierarchy but fixes gaps (h1 -> h3 becomes h1 -> h2)
 */

import * as cheerio from 'cheerio';
import type { Element as CheerioElement, AnyNode } from 'domhandler';
import { logDebug } from '../core/logger.js';

interface HeadingInfo {
  level: number;
  element: CheerioElement;
  text: string;
}

/**
 * Fix heading hierarchy in HTML content
 * Preserves the relative structure but removes gaps
 */
export function fixHeadingHierarchy(html: string): string {
  const $ = cheerio.load(html);

  // Find all headings
  const headings: HeadingInfo[] = [];
  $('h1, h2, h3, h4, h5, h6').each(function (this: AnyNode) {
    const el = this as CheerioElement;
    const tagName = el.tagName.toLowerCase();
    const level = parseInt(tagName.charAt(1), 10);
    const text = $(el).text().trim();

    headings.push({ level, element: el, text });
  });

  if (headings.length === 0) {
    return html;
  }

  // Find the minimum level used
  const levels = headings.map((h) => h.level);
  const uniqueLevels = [...new Set(levels)].sort((a, b) => a - b);

  // Create a mapping from original levels to normalized levels
  const levelMap = new Map<number, number>();
  let normalizedLevel = 1; // Start from h1

  for (const level of uniqueLevels) {
    levelMap.set(level, normalizedLevel);
    normalizedLevel++;
  }

  // Check if any changes are needed
  let needsChanges = false;
  for (const [original, normalized] of levelMap) {
    if (original !== normalized) {
      needsChanges = true;
      break;
    }
  }

  if (!needsChanges) {
    return html;
  }

  logDebug(`Fixing heading hierarchy: ${JSON.stringify(Object.fromEntries(levelMap))}`);

  // Apply the normalization
  for (const heading of headings) {
    const newLevel = levelMap.get(heading.level);
    if (newLevel !== undefined && newLevel !== heading.level) {
      const $el = $(heading.element);
      const content = $el.html();
      const attrs = heading.element.attribs || {};

      // Create new heading with correct level
      const $new = $(`<h${newLevel}>`);
      if (content !== null) {
        $new.html(content);
      }

      // Copy attributes
      for (const [key, value] of Object.entries(attrs)) {
        $new.attr(key, value as string);
      }

      $el.replaceWith($new);
    }
  }

  return $.html();
}

/**
 * Ensure the first heading in content is h1 (for chapter title)
 * while maintaining relative structure of subsequent headings
 */
export function normalizeChapterHeadings(html: string): string {
  const $ = cheerio.load(html);

  // Find first heading
  const $firstHeading = $('h1, h2, h3, h4, h5, h6').first();

  if ($firstHeading.length === 0) {
    return html;
  }

  const firstTagName = ($firstHeading[0] as CheerioElement).tagName.toLowerCase();
  const firstLevel = parseInt(firstTagName.charAt(1), 10);

  // If first heading is already h1, just fix gaps
  if (firstLevel === 1) {
    return fixHeadingHierarchy(html);
  }

  // Calculate offset to make first heading h1
  const offset = firstLevel - 1;

  // Adjust all headings by the offset
  $('h1, h2, h3, h4, h5, h6').each(function (this: AnyNode) {
    const el = this as CheerioElement;
    const tagName = el.tagName.toLowerCase();
    const currentLevel = parseInt(tagName.charAt(1), 10);
    const newLevel = Math.max(1, Math.min(6, currentLevel - offset));

    if (newLevel !== currentLevel) {
      const $el = $(el);
      const content = $el.html();
      const attrs = el.attribs || {};

      const $new = $(`<h${newLevel}>`);
      if (content !== null) {
        $new.html(content);
      }

      for (const [key, value] of Object.entries(attrs)) {
        $new.attr(key, value as string);
      }

      $el.replaceWith($new);
    }
  });

  // Now fix any remaining gaps
  return fixHeadingHierarchy($.html());
}

/**
 * Extract the first heading as chapter title
 */
export function extractChapterTitle(html: string): string | null {
  const $ = cheerio.load(html);
  const $firstHeading = $('h1, h2, h3, h4, h5, h6').first();

  if ($firstHeading.length > 0) {
    return $firstHeading.text().trim();
  }

  return null;
}
