/**
 * Content extractor - extracts main content from HTML pages
 */

import * as cheerio from 'cheerio';
import type { ImageReference, SelectorConfig } from '../core/types.js';
import { NoContentFoundError } from '../core/errors.js';
import { logDebug } from '../core/logger.js';
import { removeNoise } from './noise-remover.js';

export interface ExtractionResult {
  title: string;
  content: string;
  images: ImageReference[];
}

/**
 * Extract main content from an HTML page
 */
export function extractContent(
  html: string,
  url: string,
  selectors: SelectorConfig
): ExtractionResult {
  // First, remove noise from the entire document
  const cleanedHtml = removeNoise(html, {
    excludeSelectors: selectors.exclude,
    mergeWithDefaults: true,
  });

  const $ = cheerio.load(cleanedHtml);

  // Extract title
  const title = extractTitle($, selectors.title);
  logDebug(`Extracted title: "${title}"`);

  // Extract main content
  const content = extractMainContent($, selectors.content);

  if (!content || content.trim().length < 50) {
    throw new NoContentFoundError(url);
  }

  // Extract images from the content
  const images = extractImages(content, url);
  logDebug(`Found ${images.length} images`);

  return {
    title,
    content,
    images,
  };
}

/**
 * Extract the page title using configured selectors
 */
function extractTitle($: cheerio.CheerioAPI, titleSelectors: string[]): string {
  for (const selector of titleSelectors) {
    try {
      const $title = $(selector).first();

      if ($title.length > 0) {
        const text = $title.text().trim();

        if (text) {
          return text;
        }
      }
    } catch {
      // Invalid selector, skip
    }
  }

  // Fallback to <title> tag
  const pageTitle = $('title').text().trim();

  if (pageTitle) {
    // Remove common suffixes like " | Site Name" or " - Documentation"
    return pageTitle.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim();
  }

  return 'Untitled';
}

/**
 * Extract main content using configured selectors
 */
function extractMainContent(
  $: cheerio.CheerioAPI,
  contentSelectors: string[]
): string {
  for (const selector of contentSelectors) {
    try {
      const $content = $(selector).first();

      if ($content.length > 0) {
        const html = $content.html();

        if (html && html.trim().length > 50) {
          logDebug(`Found content with selector: ${selector}`);
          return html.trim();
        }
      }
    } catch {
      // Invalid selector, skip
    }
  }

  // Fallback: try to find the largest text block
  return findLargestTextBlock($);
}

/**
 * Find the largest text block in the document (fallback strategy)
 */
function findLargestTextBlock($: cheerio.CheerioAPI): string {
  const candidates = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '#content',
    '.post',
    '.entry',
    'section',
  ];

  let bestCandidate = '';
  let maxLength = 0;

  for (const selector of candidates) {
    try {
      $(selector).each(function () {
        const $el = $(this);
        const text = $el.text().trim();
        const html = $el.html();

        if (text.length > maxLength && html) {
          maxLength = text.length;
          bestCandidate = html;
        }
      });
    } catch {
      // Invalid selector, skip
    }
  }

  // If no good candidate found, use the body
  if (!bestCandidate || maxLength < 100) {
    const bodyHtml = $('body').html();
    if (bodyHtml) {
      bestCandidate = bodyHtml;
    }
  }

  return bestCandidate;
}

/**
 * Extract image references from HTML content
 */
function extractImages(html: string, baseUrl: string): ImageReference[] {
  const $ = cheerio.load(html);
  const images: ImageReference[] = [];
  const seen = new Set<string>();

  $('img').each(function () {
    const $img = $(this);
    const src = $img.attr('src');

    if (!src) {
      return;
    }

    // Skip data URLs (they're already embedded)
    if (src.startsWith('data:')) {
      return;
    }

    // Skip if already seen
    if (seen.has(src)) {
      return;
    }

    seen.add(src);

    const altText = $img.attr('alt') || '';

    // Get the outer HTML of the img element
    const originalHtml = $.html($img);

    images.push({
      originalUrl: src,
      altText,
      originalHtml,
    });
  });

  return images;
}

/**
 * Clean content for final output
 * Removes remaining unwanted elements and normalizes whitespace
 */
export function cleanContent(html: string): string {
  const $ = cheerio.load(html);

  // Remove any remaining scripts (shouldn't be any, but safety)
  $('script, style, noscript').remove();

  // Remove empty links
  $('a').each(function () {
    const $a = $(this);
    if (!$a.text().trim() && !$a.find('img').length) {
      $a.remove();
    }
  });

  // Get the cleaned HTML
  let cleaned = $('body').html() || $.html();

  // Normalize whitespace (but preserve intentional line breaks)
  cleaned = cleaned
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]+/g, ' ') // Collapse horizontal whitespace
    .trim();

  return cleaned;
}
