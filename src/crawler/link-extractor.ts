/**
 * Link extractor - extracts and filters links from HTML
 */

import * as cheerio from 'cheerio';
import { resolveUrl, normalizeUrl, isSameSite, isContentUrl } from '../utils/url.js';
import { logDebug } from '../core/logger.js';

export interface LinkExtractionOptions {
  /** CSS selectors to find navigation links */
  navigationSelectors: string[];
  /** Optional: selector to filter which links to include */
  chapterLinkSelector?: string;
  /** Base URL for resolving relative links */
  baseUrl: string;
  /** Only include links from the same site */
  sameSiteOnly: boolean;
}

export interface ExtractedLink {
  href: string;
  text: string;
  order: number;
}

/**
 * Extract navigation/chapter links from HTML
 */
export function extractNavigationLinks(
  html: string,
  options: LinkExtractionOptions
): ExtractedLink[] {
  const $ = cheerio.load(html);
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  let order = 0;

  // Try each navigation selector and collect ALL links
  // Don't stop at first match - we want to find all chapter links
  for (const selector of options.navigationSelectors) {
    const elements = $(selector);

    if (elements.length === 0) {
      continue;
    }

    logDebug(`Found ${elements.length} elements with selector: ${selector}`);

    elements.each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');

      if (!href) {
        return;
      }

      // Resolve the URL
      const resolvedUrl = resolveUrl(href, options.baseUrl);

      if (!resolvedUrl) {
        return;
      }

      // Normalize for deduplication
      const normalized = normalizeUrl(resolvedUrl);

      if (seen.has(normalized)) {
        return;
      }

      // Check same-site constraint
      if (options.sameSiteOnly && !isSameSite(resolvedUrl, options.baseUrl)) {
        return;
      }

      // Check if it's a content URL (not an asset)
      if (!isContentUrl(resolvedUrl)) {
        return;
      }

      // Get link text
      const text = $el.text().trim() || $el.attr('title') || '';

      // Skip empty text links (likely icons)
      if (!text) {
        return;
      }

      seen.add(normalized);
      links.push({
        href: normalized,
        text,
        order: order++,
      });
    });
  }

  logDebug(`Extracted ${links.length} unique links`);
  return links;
}

/**
 * Extract all links from the page (for fallback/auto-detection)
 */
export function extractAllLinks(html: string, baseUrl: string): ExtractedLink[] {
  const $ = cheerio.load(html);
  const links: ExtractedLink[] = [];
  const seen = new Set<string>();

  let order = 0;

  $('a[href]').each((_, element) => {
    const $el = $(element);
    const href = $el.attr('href');

    if (!href) {
      return;
    }

    const resolvedUrl = resolveUrl(href, baseUrl);

    if (!resolvedUrl) {
      return;
    }

    const normalized = normalizeUrl(resolvedUrl);

    if (seen.has(normalized)) {
      return;
    }

    if (!isSameSite(resolvedUrl, baseUrl)) {
      return;
    }

    if (!isContentUrl(resolvedUrl)) {
      return;
    }

    const text = $el.text().trim();

    seen.add(normalized);
    links.push({
      href: normalized,
      text,
      order: order++,
    });
  });

  return links;
}

/**
 * Filter links to likely chapter/content pages
 */
export function filterChapterLinks(links: ExtractedLink[]): ExtractedLink[] {
  return links.filter((link) => {
    // Skip very short text (likely not chapter titles)
    if (link.text.length < 2) {
      return false;
    }

    // Skip common non-chapter links
    const skipPatterns = [
      /^home$/i,
      /^about$/i,
      /^contact$/i,
      /^search$/i,
      /^login$/i,
      /^sign (in|up)$/i,
      /^register$/i,
      /^privacy/i,
      /^terms/i,
      /^cookie/i,
      /^share$/i,
      /^tweet$/i,
      /^facebook$/i,
      /^twitter$/i,
      /^github$/i,
      /^edit$/i,
      /^download$/i,
    ];

    for (const pattern of skipPatterns) {
      if (pattern.test(link.text)) {
        return false;
      }
    }

    return true;
  });
}
